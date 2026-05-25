export interface Rect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

// Pure math: given source dimensions and a target width/height ratio,
// return the centred crop rectangle.
export function centerCrop(src: { width: number; height: number }, targetRatio: number): Rect {
  const srcRatio = src.width / src.height;
  if (Math.abs(srcRatio - targetRatio) < 1e-9) {
    return { originX: 0, originY: 0, width: src.width, height: src.height };
  }
  if (srcRatio > targetRatio) {
    const width = Math.round(src.height * targetRatio);
    const originX = Math.round((src.width - width) / 2);
    return { originX, originY: 0, width, height: src.height };
  }
  const height = Math.round(src.width / targetRatio);
  const originY = Math.round((src.height - height) / 2);
  return { originX: 0, originY, width: src.width, height };
}

// Read uri's intrinsic dimensions, crop to targetRatio, write a sibling
// PNG tmpfile, return its uri.
export async function cropFileTo(uri: string, srcWidth: number, srcHeight: number, targetRatio: number): Promise<string> {
  const ImageManipulator = await import('expo-image-manipulator');
  const rect = centerCrop({ width: srcWidth, height: srcHeight }, targetRatio);
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop: rect }],
    { format: ImageManipulator.SaveFormat.PNG, compress: 1 },
  );
  return result.uri;
}
