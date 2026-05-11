// Standalone runner for the production extractor (server/extractor.ts).
// Pass URLs on the command line, or run with no args to use the built-in
// multi-site benchmark. Set EXTRACT_USE_LLM=true to enable the LLM fallback.
//
// Usage:
//   pnpm tsx scripts/test-extract.ts                       # benchmark
//   pnpm tsx scripts/test-extract.ts <url> [<url> ...]    # ad-hoc

import { extractFromUrl, type ExtractedProduct, type ExtractDebug } from "../server/extractor";

const BENCHMARK_URLS: Array<{ label: string; url: string }> = [
  {
    label: "Net-a-Porter (Cloudflare-blocked)",
    url: "https://www.net-a-porter.com/en-us/shop/product/toteme/clothing/maxi-dresses/twisted-draped-satin-maxi-dress/1647597339497002",
  },
  {
    label: "Net-a-Porter #2",
    url: "https://www.net-a-porter.com/en-us/shop/product/toteme/clothing/maxi-dresses/slouch-waist-gathered-wool-crepe-maxi-dress/46376663162936234",
  },
  {
    label: "Mr Porter (same group as NAP)",
    url: "https://www.mrporter.com/en-us/mens/product/loro-piana/clothing/crew-necks/baby-cashmere-sweater/43769801096395093",
  },
  {
    label: "The Outnet (NAP group, outlet)",
    url: "https://www.theoutnet.com/en-us/shop/product/toteme/clothing/midi-dresses/draped-tencel-lyocell-blend-midi-dress/1647597321693030",
  },
  {
    label: "Reformation (SSR + full JSON-LD)",
    url: "https://www.thereformation.com/products/jeany-silk-dress/1311710.html",
  },
  {
    label: "Farfetch (SSR + ProductGroup JSON-LD)",
    url: "https://www.farfetch.com/shopping/women/toteme-draped-detailing-textured-maxi-dress-item-23720862.aspx",
  },
  {
    label: "Zara (Akamai-blocked, slug-only fallback)",
    url: "https://www.zara.com/us/en/embroidered-printed-dress-p03564086.html",
  },
  {
    label: "FWRD / Forward (SSR + JSON-LD)",
    url: "https://www.fwrd.com/product-toteme-evening-tank-dress-in-black/TOTF-WD94/",
  },
  {
    label: "MyTheresa (deliberately bot-blocked)",
    url: "https://www.mytheresa.com/us/en/women/toteme-moire-mules-black-p00931670",
  },
];

async function runOne(label: string, url: string) {
  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log(`▸ ${label}`);
  console.log(`  ${url}`);
  console.log("──────────────────────────────────────────────────────────────────────");

  const t0 = Date.now();
  const { product, debug } = await extractFromUrl(url);
  const ms = Date.now() - t0;

  const status = debug.fetched
    ? `fetched(${debug.fetchUa}, ${debug.fetchStatus}, ${formatBytes(debug.htmlBytes)})`
    : debug.challenge
      ? `BLOCKED (challenge / ${debug.fetchStatus ?? "n/a"})`
      : `no fetch (${debug.fetchStatus ?? "n/a"})`;

  console.log(`  ${ms}ms  • ${status}  • llm=${debug.llmUsed}`);
  if (debug.errors.length) console.log("  errors: " + debug.errors.join(" | "));
  console.log("");
  printRow("title      ", product.title, debug.source.title);
  printRow("brand      ", product.brand, null);
  printRow("category   ", product.category, null);
  printRow("price      ", product.price, null);
  printRow("currency   ", product.currency, null);
  printRow("color      ", product.color, null);
  printRow("size       ", product.size, null);
  printRow("description", product.description, debug.source.description);
  printRow("imageUrl   ", product.imageUrl, debug.source.image);

  return { label, product, debug };
}

function printRow(field: string, value: any, source: string | null) {
  const v =
    value === null || value === undefined
      ? "—"
      : typeof value === "string"
        ? truncate(value, 80)
        : String(value);
  const tag = source ? `  [${source}]` : "";
  const ok = value === null || value === undefined ? "✗" : "✓";
  console.log(`  ${ok} ${field}  ${v}${tag}`);
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function formatBytes(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

async function main() {
  const cliUrls = process.argv.slice(2);
  const targets = cliUrls.length
    ? cliUrls.map((url) => ({ label: url, url }))
    : BENCHMARK_URLS;

  const llmFlag = process.env.EXTRACT_USE_LLM === "true";
  console.log(`\nEXTRACT_USE_LLM=${llmFlag ? "true (LLM fallback enabled)" : "false (LLM disabled — pure HTML/regex pipeline)"}`);

  const results: Array<{ label: string; product: ExtractedProduct; debug: ExtractDebug }> = [];
  for (const { label, url } of targets) {
    try {
      results.push(await runOne(label, url));
    } catch (e) {
      console.error(`  threw: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Summary table
  console.log("\n\n══════════════════════════════════════════════════════════════════════");
  console.log("SUMMARY");
  console.log("══════════════════════════════════════════════════════════════════════\n");
  const fields: Array<keyof ExtractedProduct> = ["title", "brand", "imageUrl", "category", "price", "color", "description"];
  const header = "site".padEnd(40) + "  " + fields.map((f) => f.slice(0, 4).padEnd(5)).join(" ");
  console.log(header);
  console.log("─".repeat(header.length));
  for (const { label, product, debug } of results) {
    const labelCol = truncate(label, 38).padEnd(40);
    const cells = fields.map((f) => (product[f] !== null ? "✓" : "·").padEnd(5));
    const tail = debug.challenge ? "  ⚠ blocked" : debug.fetched ? "" : "  (no html)";
    console.log(labelCol + "  " + cells.join(" ") + tail);
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
