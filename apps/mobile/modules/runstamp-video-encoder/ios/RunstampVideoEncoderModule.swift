import AVFoundation
import ExpoModulesCore
import UIKit

// Encoding session state. One per concurrent encode; the caller passes
// the opaque sessionId back to addFrame / finishEncoding. We hold AVFoundation
// objects strongly here so the codec pipeline survives across async hops.
private final class EncodingSession {
  let writer: AVAssetWriter
  let input: AVAssetWriterInput
  let adaptor: AVAssetWriterInputPixelBufferAdaptor
  let fps: Int32
  let outputURL: URL

  init(writer: AVAssetWriter, input: AVAssetWriterInput, adaptor: AVAssetWriterInputPixelBufferAdaptor, fps: Int32, outputURL: URL) {
    self.writer = writer
    self.input = input
    self.adaptor = adaptor
    self.fps = fps
    self.outputURL = outputURL
  }
}

internal struct StartOptions: Record {
  @Field var width: Int = 1080
  @Field var height: Int = 1920
  @Field var fps: Int = 30
  /**
   Optional absolute file path for the MP4 output. When empty, the module
   generates a unique path in NSTemporaryDirectory(). The actual path used
   is returned from startEncoding so callers can hand it off downstream.
   */
  @Field var outputPath: String = ""
}

internal enum EncoderError: String, Error {
  case sessionNotFound = "session-not-found"
  case invalidFrame = "invalid-frame"
  case pixelBufferPoolUnavailable = "pixel-buffer-pool-unavailable"
  case pixelBufferCreationFailed = "pixel-buffer-creation-failed"
  case writeFailed = "write-failed"
  case writerNotReady = "writer-not-ready"
}

public class RunstampVideoEncoderModule: Module {
  // Sessions live on this dispatch queue's serial domain so we don't need
  // separate locking. All session mutation happens inside AsyncFunction
  // blocks which Expo runs on a background queue — but multiple JS calls
  // could overlap, so we serialize access here.
  private let sessionQueue = DispatchQueue(label: "fun.gilla.runstamp.videoencoder.sessions")
  private var sessions: [String: EncodingSession] = [:]

  private func setSession(_ id: String, _ session: EncodingSession?) {
    sessionQueue.sync {
      if let session = session {
        self.sessions[id] = session
      } else {
        self.sessions.removeValue(forKey: id)
      }
    }
  }

  private func getSession(_ id: String) -> EncodingSession? {
    return sessionQueue.sync { self.sessions[id] }
  }

  public func definition() -> ModuleDefinition {
    Name("RunstampVideoEncoder")

    AsyncFunction("startEncoding") { (options: StartOptions) -> [String: String] in
      let sessionId = UUID().uuidString
      let resolvedPath: String
      if options.outputPath.isEmpty {
        let tmpDir = NSTemporaryDirectory() as NSString
        resolvedPath = tmpDir.appendingPathComponent("runstamp-export-\(sessionId).mp4")
      } else {
        resolvedPath = options.outputPath
      }
      let outputURL = URL(fileURLWithPath: resolvedPath)

      // Stale output from a prior aborted run would make AVAssetWriter init
      // throw. Clean it first; ignore errors (the file may not exist).
      try? FileManager.default.removeItem(at: outputURL)

      let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)

      // Bitrate scales with pixel count — 4 bits/pixel/frame is a reasonable
      // floor for short-form social. Floor at 2 Mbps so tiny inputs still
      // look OK. yuv420p in the source pixel buffer attributes; AVAssetWriter
      // does its own colour conversion under the hood.
      let pixelCount = options.width * options.height
      let bitRate = max(pixelCount * 4, 2_000_000)

      let videoSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: options.width,
        AVVideoHeightKey: options.height,
        AVVideoCompressionPropertiesKey: [
          AVVideoAverageBitRateKey: bitRate,
          AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
          AVVideoExpectedSourceFrameRateKey: options.fps,
          AVVideoMaxKeyFrameIntervalKey: options.fps, // 1s keyframe interval
        ]
      ]

      let input = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
      input.expectsMediaDataInRealTime = false

      // BGRA in the source buffer is the most efficient for CoreGraphics to
      // draw into — UIImage's CGImage data layout is exactly this on iOS,
      // so the per-frame draw is effectively a memcpy.
      let pixelBufferAttributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: options.width,
        kCVPixelBufferHeightKey as String: options.height,
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
      ]

      let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: pixelBufferAttributes
      )

      guard writer.canAdd(input) else {
        throw EncoderError.writerNotReady
      }
      writer.add(input)

      guard writer.startWriting() else {
        throw writer.error ?? EncoderError.writerNotReady
      }
      writer.startSession(atSourceTime: .zero)

      let session = EncodingSession(
        writer: writer,
        input: input,
        adaptor: adaptor,
        fps: Int32(options.fps),
        outputURL: outputURL
      )
      self.setSession(sessionId, session)

      return ["sessionId": sessionId, "outputPath": resolvedPath]
    }

    AsyncFunction("addFrame") { (sessionId: String, pngPath: String, frameIndex: Int) in
      guard let session = self.getSession(sessionId) else {
        throw EncoderError.sessionNotFound
      }

      // Bounded backpressure wait. Bail if the writer has failed (disk full,
      // app suspended mid-export) or if we've waited far longer than any real
      // frame should need — otherwise a never-ready failed writer hangs the
      // export forever.
      var waitTicks = 0
      while !session.input.isReadyForMoreMediaData {
        if session.writer.status == .failed {
          throw session.writer.error ?? EncoderError.writeFailed
        }
        if waitTicks >= 2000 { // 2000 * 5ms = 10s ceiling
          throw EncoderError.writeFailed
        }
        try await Task.sleep(nanoseconds: 5_000_000)
        waitTicks += 1
      }

      guard let image = UIImage(contentsOfFile: pngPath),
            let cgImage = image.cgImage else {
        throw EncoderError.invalidFrame
      }

      guard let pool = session.adaptor.pixelBufferPool else {
        throw EncoderError.pixelBufferPoolUnavailable
      }

      var pixelBuffer: CVPixelBuffer?
      let status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer)
      guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
        throw EncoderError.pixelBufferCreationFailed
      }

      CVPixelBufferLockBaseAddress(buffer, [])
      defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

      let width = CVPixelBufferGetWidth(buffer)
      let height = CVPixelBufferGetHeight(buffer)
      let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)

      guard let baseAddress = CVPixelBufferGetBaseAddress(buffer) else {
        throw EncoderError.pixelBufferCreationFailed
      }

      let colorSpace = CGColorSpaceCreateDeviceRGB()
      // BGRA = byteOrder32Little + premultipliedFirst on iOS. CGContext draws
      // CGImage straight into this layout without a colour-space conversion.
      let bitmapInfo: UInt32 =
        CGImageAlphaInfo.premultipliedFirst.rawValue |
        CGBitmapInfo.byteOrder32Little.rawValue

      guard let context = CGContext(
        data: baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: bitmapInfo
      ) else {
        throw EncoderError.pixelBufferCreationFailed
      }

      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

      let presentationTime = CMTime(value: Int64(frameIndex), timescale: session.fps)
      if !session.adaptor.append(buffer, withPresentationTime: presentationTime) {
        throw session.writer.error ?? EncoderError.writeFailed
      }
    }

    AsyncFunction("finishEncoding") { (sessionId: String) -> [String: String] in
      guard let session = self.getSession(sessionId) else {
        throw EncoderError.sessionNotFound
      }

      session.input.markAsFinished()

      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        session.writer.finishWriting {
          if session.writer.status == .completed {
            continuation.resume()
          } else {
            continuation.resume(throwing: session.writer.error ?? EncoderError.writeFailed)
          }
        }
      }

      self.setSession(sessionId, nil)

      return ["uri": session.outputURL.absoluteString]
    }

    AsyncFunction("cancelEncoding") { (sessionId: String) in
      guard let session = self.getSession(sessionId) else { return }
      session.writer.cancelWriting()
      try? FileManager.default.removeItem(at: session.outputURL)
      self.setSession(sessionId, nil)
    }
  }
}
