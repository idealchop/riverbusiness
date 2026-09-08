'use client';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;
const MAX_DATA_URL_CHARS = 700_000;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|heic|heif|bmp|svg)$/i.test(file.name || '');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image file.'));
    };
    img.src = url;
  });
}

async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY);
  });
  if (!blob) throw new Error('Could not compress image.');
  return blob;
}

/** Embed in the doc so attach works even when Storage rules block uploads. */
export async function fileToEmbeddedImageSrc(file: File): Promise<string> {
  if (!isLikelyImageFile(file)) {
    throw new Error('Please use an image file.');
  }
  const compressed = await compressImage(file);
  const src = await blobToDataUrl(compressed);
  if (src.length > MAX_DATA_URL_CHARS) {
    throw new Error('That image is still too large after compression. Try a smaller photo.');
  }
  return src;
}
