// Client-side image processing. Resizes phone-sized JPEGs to a
// reasonable full-size + a square thumbnail before upload, so the
// server never sees a 12 MB original.

const FULL_MAX_EDGE = 2048;
const FULL_QUALITY = 0.85;
const THUMB_EDGE = 320;
const THUMB_QUALITY = 0.8;

export type ProcessedImage = {
  full: Blob;
  thumbnail: Blob;
};

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap handles EXIF orientation in modern browsers.
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function fitInside(
  width: number,
  height: number,
  maxEdge: number,
): { w: number; h: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { w: width, h: height };
  const scale = maxEdge / longest;
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas encode failed"));
      },
      type,
      quality,
    );
  });
}

async function drawFull(bitmap: ImageBitmap): Promise<Blob> {
  const { w, h } = fitInside(bitmap.width, bitmap.height, FULL_MAX_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvasToBlob(canvas, "image/jpeg", FULL_QUALITY);
}

async function drawThumb(bitmap: ImageBitmap): Promise<Blob> {
  // Center-crop square thumbnail.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - side) / 2);
  const sy = Math.floor((bitmap.height - side) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_EDGE;
  canvas.height = THUMB_EDGE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, THUMB_EDGE, THUMB_EDGE);
  return canvasToBlob(canvas, "image/jpeg", THUMB_QUALITY);
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await loadBitmap(file);
  try {
    const [full, thumbnail] = await Promise.all([
      drawFull(bitmap),
      drawThumb(bitmap),
    ]);
    return { full, thumbnail };
  } finally {
    bitmap.close?.();
  }
}
