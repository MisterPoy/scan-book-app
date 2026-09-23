const SUPPORTED_SHELF_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_LONG_EDGE = 3000;
// Garde une marge sous la limite de corps de requête de la fonction Vercel.
const MAX_DATA_URL_LENGTH = 4_000_000;

export interface PreparedShelfImage {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  encodedBytes: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Cette image n'a pas pu être lue."));
    };
    image.src = objectUrl;
  });
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",", 2)[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

export async function prepareShelfImage(file: File): Promise<PreparedShelfImage> {
  if (!SUPPORTED_SHELF_IMAGE_TYPES.has(file.type)) {
    throw new Error("Format non pris en charge. Utilisez une image JPEG, PNG ou WebP.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Cette photo dépasse 15 Mo. Recadrez-la ou réduisez sa taille.");
  }

  const image = await loadImage(file);
  const ratio = Math.min(1, MAX_LONG_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("La préparation de l'image n'est pas disponible sur ce navigateur.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.9;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.58) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error("La photo reste trop volumineuse après compression. Recadrez-la davantage.");
  }

  return {
    id: crypto.randomUUID(),
    name: file.name || "Photo d'étagère",
    dataUrl,
    width,
    height,
    encodedBytes: estimateDataUrlBytes(dataUrl),
  };
}
