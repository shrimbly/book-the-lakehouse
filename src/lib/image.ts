// Client-side image processing. Resizes phone-sized JPEGs to a
// reasonable full-size + a square thumbnail before upload, so the
// server never sees a 12 MB original.

const FULL_MAX_EDGE = 2048;
const FULL_QUALITY = 0.85;
const THUMB_EDGE = 320;
const THUMB_QUALITY = 0.8;
const PROFILE_EDGE = 512;
const PROFILE_QUALITY = 0.86;

export type ProfileCrop = {
  zoom: number;
  x: number;
  y: number;
};

export type ProfileCropSource = {
  sx: number;
  sy: number;
  side: number;
};

export type ProfilePreviewFrame = {
  widthPercent: number;
  heightPercent: number;
  leftPercent: number;
  topPercent: number;
};

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

export function calculateProfileCropSource(
  width: number,
  height: number,
  crop: ProfileCrop,
): ProfileCropSource {
  const zoom = Math.min(Math.max(crop.zoom, 1), 3);
  const side = Math.min(width, height) / zoom;
  const maxX = Math.max(0, width - side);
  const maxY = Math.max(0, height - side);
  const x = Math.min(Math.max(crop.x, -1), 1);
  const y = Math.min(Math.max(crop.y, -1), 1);

  return {
    sx: Math.round(((1 - x) / 2) * maxX),
    sy: Math.round(((1 - y) / 2) * maxY),
    side,
  };
}

export function calculateProfilePreviewFrame(
  width: number,
  height: number,
  crop: ProfileCrop,
): ProfilePreviewFrame {
  const { sx, sy, side } = calculateProfileCropSource(width, height, crop);
  return {
    widthPercent: (width / side) * 100,
    heightPercent: (height / side) * 100,
    leftPercent: -(sx / side) * 100,
    topPercent: -(sy / side) * 100,
  };
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

async function drawSquare(
  bitmap: ImageBitmap,
  edge: number,
  quality: number,
): Promise<Blob> {
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - side) / 2);
  const sy = Math.floor((bitmap.height - side) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, edge, edge);
  return canvasToBlob(canvas, "image/jpeg", quality);
}

async function drawCroppedSquare(
  bitmap: ImageBitmap,
  edge: number,
  quality: number,
  crop: ProfileCrop,
): Promise<Blob> {
  const { sx, sy, side } = calculateProfileCropSource(
    bitmap.width,
    bitmap.height,
    crop,
  );
  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, edge, edge);
  return canvasToBlob(canvas, "image/jpeg", quality);
}

async function drawThumb(bitmap: ImageBitmap): Promise<Blob> {
  return drawSquare(bitmap, THUMB_EDGE, THUMB_QUALITY);
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

export async function processProfileImage(
  file: File,
  crop: ProfileCrop = { zoom: 1, x: 0, y: 0 },
): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  try {
    return await drawCroppedSquare(bitmap, PROFILE_EDGE, PROFILE_QUALITY, crop);
  } finally {
    bitmap.close?.();
  }
}
