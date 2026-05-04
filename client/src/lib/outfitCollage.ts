/**
 * Draws a horizontal strip of item images onto a canvas and returns a Blob.
 * Falls back gracefully when images fail to load (CORS etc.).
 */
export async function generateOutfitCollage(
  imageUrls: string[],
  outfitName: string
): Promise<Blob | null> {
  const CELL = 200;
  const HEADER = 48;
  const cols = Math.min(imageUrls.length, 5);
  if (cols === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = cols * CELL;
  canvas.height = CELL + HEADER;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  ctx.fillStyle = "#F5F5F5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header bar
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, HEADER);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `500 ${Math.min(18, Math.floor(canvas.width / (outfitName.length * 0.7 + 2)))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(outfitName.toUpperCase(), canvas.width / 2, HEADER / 2);

  // Load and draw images
  const loadImage = (url: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
      setTimeout(() => resolve(null), 5000);
    });

  const images = await Promise.all(imageUrls.slice(0, 5).map(loadImage));

  images.forEach((img, i) => {
    const x = i * CELL;
    const y = HEADER;
    if (img) {
      // Cover-fit into cell
      const scale = Math.max(CELL / img.width, CELL / img.height);
      const sw = CELL / scale;
      const sh = CELL / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, x, y, CELL, CELL);
    } else {
      ctx.fillStyle = "#E8E8E8";
      ctx.fillRect(x, y, CELL, CELL);
    }
    // Cell border
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, CELL, CELL);
  });

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}
