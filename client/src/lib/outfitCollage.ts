/**
 * Generates an editorial-style outfit collage image.
 * Layout: header (name + price), 2-column item cards (category badge, image,
 * brand, title, price), footer with Style Iconoclast logo image.
 */

export interface CollageItem {
  imageUrl?: string | null;
  brand?: string | null;
  title: string;
  category?: string | null;
  slot?: string | null;
  purchasePrice?: number | null;
  currentPrice?: number | null;
  currency?: string | null;
}

const LOGO_URL = "/manus-storage/style-iconoclast-logo-new_5932eaf0.jpeg";

export async function generateOutfitCollage(
  items: CollageItem[],
  outfitName: string,
  totalPrice?: number | null,
  currency = "USD"
): Promise<Blob | null> {
  const filled = items.filter((i) => i.imageUrl || i.title);
  if (filled.length === 0) return null;

  const COLS = 2;
  const CARD_W = 420;
  const IMG_H = 420;
  const META_H = 120;
  const CARD_H = IMG_H + META_H;
  const GAP = 2;
  const HEADER_H = 100;
  const FOOTER_H = 80;
  const ROWS = Math.ceil(filled.length / COLS);
  const W = COLS * CARD_W + (COLS - 1) * GAP;
  const H = HEADER_H + ROWS * CARD_H + (ROWS - 1) * GAP + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = "#000000";
  ctx.font = "bold 42px 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(outfitName.toUpperCase(), 32, 20);

  const subParts: string[] = [`${filled.length} piece${filled.length !== 1 ? "s" : ""}`];
  if (totalPrice) subParts.push(`${currency} ${totalPrice.toLocaleString()}`);
  ctx.fillStyle = "#888888";
  ctx.font = "22px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(subParts.join("   "), 32, 68);

  const loadImage = (url: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
      setTimeout(() => resolve(null), 6000);
    });

  // Load item images + logo in parallel
  const [loadedImages, logoImg] = await Promise.all([
    Promise.all(
      filled.map((item) => (item.imageUrl ? loadImage(item.imageUrl) : Promise.resolve(null)))
    ),
    loadImage(LOGO_URL),
  ]);

  filled.forEach((item, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x = col * (CARD_W + GAP);
    const y = HEADER_H + row * (CARD_H + GAP);

    // Image area
    ctx.fillStyle = "#F0EFED";
    ctx.fillRect(x, y, CARD_W, IMG_H);

    const img = loadedImages[idx];
    if (img) {
      const scale = Math.max(CARD_W / img.width, IMG_H / img.height);
      const sw = CARD_W / scale;
      const sh = IMG_H / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, x, y, CARD_W, IMG_H);
    }

    // Category badge
    const badge = (item.slot || item.category || "").toUpperCase();
    if (badge) {
      const BADGE_PAD_X = 14;
      const bh = 28;
      ctx.font = "bold 16px 'Helvetica Neue', Arial, sans-serif";
      const bw = ctx.measureText(badge).width + BADGE_PAD_X * 2;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(x + 14, y + 14, bw, bh);
      ctx.fillStyle = "#000000";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(badge, x + 14 + BADGE_PAD_X, y + 14 + bh / 2);
    }

    // Meta area
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y + IMG_H, CARD_W, META_H);

    if (item.brand) {
      ctx.fillStyle = "#888888";
      ctx.font = "bold 16px 'Helvetica Neue', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(item.brand.toUpperCase(), x + 20, y + IMG_H + 16);
    }

    ctx.fillStyle = "#000000";
    ctx.font = "24px 'Helvetica Neue', Arial, sans-serif";
    ctx.textBaseline = "top";
    const titleY = y + IMG_H + (item.brand ? 38 : 20);
    const maxW = CARD_W - 40;
    const words = item.title.split(" ");
    let line = "";
    let lineY = titleY;
    let lineCount = 0;
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line && lineCount < 1) {
        ctx.fillText(line, x + 20, lineY);
        line = word;
        lineY += 30;
        lineCount++;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x + 20, lineY);

    const price = item.purchasePrice ?? item.currentPrice;
    if (price) {
      const cur = item.currency ?? currency;
      ctx.fillStyle = "#444444";
      ctx.font = "20px 'Helvetica Neue', Arial, sans-serif";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${cur} ${price.toLocaleString()}`, x + 20, y + IMG_H + META_H - 14);
    }
  });

  // Footer — white background with top border, logo centred
  const footerY = HEADER_H + ROWS * CARD_H + (ROWS - 1) * GAP;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, footerY, W, FOOTER_H);
  ctx.strokeStyle = "#E0E0E0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(W, footerY);
  ctx.stroke();

  if (logoImg) {
    // Scale logo to fit within 50px tall, centred horizontally
    const logoH = 50;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    const logoX = (W - logoW) / 2;
    const logoY = footerY + (FOOTER_H - logoH) / 2;
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
  } else {
    // Fallback to text if image fails to load
    ctx.fillStyle = "#000000";
    ctx.font = "bold 20px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("STYLE ICONOCLAST", W / 2, footerY + FOOTER_H / 2);
  }

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.93));
}
