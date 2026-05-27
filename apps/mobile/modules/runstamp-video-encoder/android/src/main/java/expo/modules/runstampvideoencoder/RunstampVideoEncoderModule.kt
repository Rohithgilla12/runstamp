package expo.modules.runstampvideoencoder

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.max

// Encoding session state. One per concurrent encode. JS owns the lifetime
// via the opaque sessionId. We hold MediaCodec + MediaMuxer here so the
// pipeline survives across async hops without finalizers reclaiming them.
internal class EncodingSession(
  val codec: MediaCodec,
  val muxer: MediaMuxer,
  val fps: Int,
  val width: Int,
  val height: Int,
  val outputPath: String,
) {
  var trackIndex: Int = -1
  var muxerStarted: Boolean = false
  val bufferInfo = MediaCodec.BufferInfo()
}

internal class StartOptions : Record {
  @Field var width: Int = 1080
  @Field var height: Int = 1920
  @Field var fps: Int = 30
  // Optional absolute file path for the MP4 output. When empty, the module
  // generates a unique path in the app's cache dir. The actual path used
  // is returned from startEncoding so callers can hand it off downstream.
  @Field var outputPath: String = ""
}

internal class EncoderException(code: String, message: String? = null) :
  CodedException(code, message ?: code, null)

class RunstampVideoEncoderModule : Module() {
  private val sessions = ConcurrentHashMap<String, EncodingSession>()

  override fun definition() = ModuleDefinition {
    Name("RunstampVideoEncoder")

    AsyncFunction("startEncoding") { options: StartOptions ->
      val sessionId = UUID.randomUUID().toString()
      val resolvedPath: String = if (options.outputPath.isEmpty()) {
        val cacheDir = appContext.reactContext?.cacheDir
          ?: throw EncoderException("no-cache-dir", "Could not resolve cache dir for output path")
        File(cacheDir, "runstamp-export-$sessionId.mp4").absolutePath
      } else {
        options.outputPath
      }

      // Stale output from a prior aborted run would make MediaMuxer constructor
      // throw "file already exists" on some Android versions. Clean it.
      File(resolvedPath).delete()

      val format = MediaFormat.createVideoFormat(
        MediaFormat.MIMETYPE_VIDEO_AVC, options.width, options.height
      ).apply {
        // YUV420_FLEXIBLE lets us write planar I420 into the input buffer
        // without locking ourselves to a specific vendor pixel layout.
        // The encoder query its actual format via getInputImage() if we
        // need plane strides, but for our case we go straight to bytes.
        setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
        setInteger(MediaFormat.KEY_BIT_RATE, max(options.width * options.height * 4, 2_000_000))
        setInteger(MediaFormat.KEY_FRAME_RATE, options.fps)
        // 1s keyframe interval matches AVAssetWriter's default on iOS so
        // downstream players (IG Stories, Photos) behave consistently.
        setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
      }

      val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
      codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
      codec.start()

      val muxer = MediaMuxer(resolvedPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

      sessions[sessionId] = EncodingSession(
        codec = codec,
        muxer = muxer,
        fps = options.fps,
        width = options.width,
        height = options.height,
        outputPath = resolvedPath,
      )

      return@AsyncFunction mapOf("sessionId" to sessionId, "outputPath" to resolvedPath)
    }

    AsyncFunction("addFrame") { sessionId: String, pngPath: String, frameIndex: Int ->
      val session = sessions[sessionId] ?: throw EncoderException("session-not-found")

      val bitmap = BitmapFactory.decodeFile(pngPath)
        ?: throw EncoderException("invalid-frame", "Could not decode PNG at $pngPath")

      try {
        if (bitmap.width != session.width || bitmap.height != session.height) {
          throw EncoderException(
            "size-mismatch",
            "Frame ${bitmap.width}x${bitmap.height} does not match session ${session.width}x${session.height}",
          )
        }

        // Convert ARGB (Android Bitmap) to I420 planar (Y, then U, then V).
        // I420 is the canonical "YUV420 planar" layout — same memory layout
        // the codec expects under COLOR_FormatYUV420Flexible on every device
        // we've seen. If we ever see a device with a quirky stride, we'd
        // switch to the Image-based input API and respect the per-plane
        // rowStride / pixelStride.
        val yuv = argbBitmapToI420(bitmap)

        // Bound the wait so we never deadlock if the codec stalls.
        val inputIndex = session.codec.dequeueInputBuffer(50_000)
        if (inputIndex < 0) {
          throw EncoderException("no-input-buffer", "Encoder did not yield an input buffer in time")
        }
        val inputBuffer = session.codec.getInputBuffer(inputIndex)
          ?: throw EncoderException("input-buffer-null")

        inputBuffer.clear()
        inputBuffer.put(yuv)

        val ptsUs = (frameIndex.toLong() * 1_000_000L) / session.fps
        session.codec.queueInputBuffer(inputIndex, 0, yuv.size, ptsUs, 0)

        drainOutput(session, endOfStream = false)
      } finally {
        bitmap.recycle()
      }
    }

    AsyncFunction("finishEncoding") { sessionId: String ->
      val session = sessions[sessionId] ?: throw EncoderException("session-not-found")

      // Signal end-of-stream by queuing an empty input buffer with the EOS
      // flag. The encoder will then drain any remaining frames into the
      // muxer; drainOutput returns when it sees BUFFER_FLAG_END_OF_STREAM.
      val inputIndex = session.codec.dequeueInputBuffer(50_000)
      if (inputIndex < 0) {
        throw EncoderException("no-input-buffer", "Could not signal end-of-stream")
      }
      session.codec.queueInputBuffer(
        inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM
      )

      drainOutput(session, endOfStream = true)

      try { session.codec.stop() } catch (_: Exception) {}
      session.codec.release()
      if (session.muxerStarted) {
        try { session.muxer.stop() } catch (_: Exception) {}
      }
      session.muxer.release()

      sessions.remove(sessionId)

      return@AsyncFunction mapOf("uri" to "file://${session.outputPath}")
    }

    AsyncFunction("cancelEncoding") { sessionId: String ->
      val session = sessions.remove(sessionId) ?: return@AsyncFunction
      try { session.codec.stop() } catch (_: Exception) {}
      session.codec.release()
      if (session.muxerStarted) {
        try { session.muxer.stop() } catch (_: Exception) {}
      }
      session.muxer.release()
      File(session.outputPath).delete()
    }
  }

  // Pump encoder output buffers into the muxer until either the codec is
  // empty (when endOfStream=false) or we see EOS (when endOfStream=true).
  private fun drainOutput(session: EncodingSession, endOfStream: Boolean) {
    while (true) {
      val outputIndex = session.codec.dequeueOutputBuffer(session.bufferInfo, 50_000)
      when {
        outputIndex == MediaCodec.INFO_TRY_AGAIN_LATER -> {
          // No output ready. In non-EOS mode this means "come back later";
          // in EOS mode we must keep waiting until EOS arrives.
          if (!endOfStream) return
        }
        outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
          // Fires exactly once, right after the first encoded frame. This
          // is when we have the SPS/PPS we need to start the muxer.
          if (session.muxerStarted) {
            throw EncoderException("format-changed-twice")
          }
          val newFormat = session.codec.outputFormat
          session.trackIndex = session.muxer.addTrack(newFormat)
          session.muxer.start()
          session.muxerStarted = true
        }
        outputIndex >= 0 -> {
          val outputBuffer = session.codec.getOutputBuffer(outputIndex)
            ?: throw EncoderException("output-buffer-null")

          // Codec config bytes (CSD) are delivered separately via the format
          // change path above — discard the duplicate copy here.
          if ((session.bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) {
            session.bufferInfo.size = 0
          }

          if (session.bufferInfo.size != 0 && session.muxerStarted) {
            outputBuffer.position(session.bufferInfo.offset)
            outputBuffer.limit(session.bufferInfo.offset + session.bufferInfo.size)
            session.muxer.writeSampleData(session.trackIndex, outputBuffer, session.bufferInfo)
          }

          session.codec.releaseOutputBuffer(outputIndex, false)

          if ((session.bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
            return
          }
        }
      }
    }
  }

  // ARGB_8888 → I420 planar. Standard BT.601 full-range coefficients
  // matching what AVAssetWriter does under the hood on iOS, so iPhone +
  // Android exports look perceptually identical.
  //
  // Y plane: width × height bytes
  // U plane: (width/2) × (height/2) bytes
  // V plane: (width/2) × (height/2) bytes
  private fun argbBitmapToI420(bitmap: Bitmap): ByteArray {
    val width = bitmap.width
    val height = bitmap.height
    val argb = IntArray(width * height)
    bitmap.getPixels(argb, 0, width, 0, 0, width, height)

    val frameSize = width * height
    val chromaSize = frameSize / 4
    val yuv = ByteArray(frameSize + 2 * chromaSize)

    var yIndex = 0
    var uIndex = frameSize
    var vIndex = frameSize + chromaSize

    for (j in 0 until height) {
      for (i in 0 until width) {
        val pixel = argb[j * width + i]
        val r = (pixel shr 16) and 0xFF
        val g = (pixel shr 8) and 0xFF
        val b = pixel and 0xFF

        // BT.601 limited-range RGB → YUV
        val y = ((66 * r + 129 * g + 25 * b + 128) shr 8) + 16
        yuv[yIndex++] = y.toByte()

        // Chroma is 2:2 subsampled — only sample on even (j,i) pairs.
        if (j % 2 == 0 && i % 2 == 0) {
          val u = ((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128
          val v = ((112 * r - 94 * g - 18 * b + 128) shr 8) + 128
          yuv[uIndex++] = u.toByte()
          yuv[vIndex++] = v.toByte()
        }
      }
    }

    return yuv
  }
}
