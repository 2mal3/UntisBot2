import Jimp from "jimp";
import jsQr from "jsqr";


export async function fetchAndDecodeQR(url: string): Promise<string | null> {
  if (!url) {
    return null;
  }

  const imageData = await Jimp.read(url);
  const decodedQR = jsQr(
    new Uint8ClampedArray(imageData.bitmap.data.buffer),
    imageData.bitmap.width,
    imageData.bitmap.height
  );

  if (!decodedQR) {
    return null;
  }

  return decodedQR.data;
}
