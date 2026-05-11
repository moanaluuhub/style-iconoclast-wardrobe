// Quick forensic tool: fetch URL and show what's actually in the head.
// Usage: pnpm tsx scripts/dump-html.ts <url>

const url = process.argv[2];
if (!url) {
  console.error("Usage: pnpm tsx scripts/dump-html.ts <url>");
  process.exit(1);
}

const HEADERS_TRIES: Array<{ label: string; headers: Record<string, string> }> = [
  {
    label: "googlebot",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      Accept: "text/html",
    },
  },
  {
    label: "chrome",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  },
];

async function run() {
  for (const { label, headers } of HEADERS_TRIES) {
    console.log(`\n══ UA: ${label} ════════════════════════════════════════════`);
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });
      const text = await res.text();
      console.log(`status: ${res.status} ${res.statusText}`);
      console.log(`bytes:  ${text.length}`);
      console.log(`final:  ${res.url}`);
      console.log(`isChallenge heuristics:`);
      console.log(`  length<800        : ${text.length < 800}`);
      console.log(`  has _cf_chl_opt   : ${text.includes("_cf_chl_opt")}`);
      console.log(`  has cf-browser-v  : ${text.includes("cf-browser-verification")}`);
      console.log(`  has Enable JS+ck  : ${text.includes("Enable JavaScript and cookies")}`);
      console.log(`  has window.isBotPage : ${text.includes("window.isBotPage")}`);

      const headMatch = text.match(/<head[\s\S]*?<\/head>/i);
      console.log(`\n── <head> first 1500 bytes ──`);
      console.log((headMatch?.[0] ?? text.slice(0, 1500)).slice(0, 1500));

      const jsonLdMatches = [...text.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      console.log(`\n── JSON-LD blocks: ${jsonLdMatches.length}`);
      jsonLdMatches.slice(0, 3).forEach((m, i) => {
        console.log(`\n[${i}]`);
        try {
          const obj = JSON.parse(m[1].trim());
          console.log(JSON.stringify(obj, null, 2).slice(0, 1200));
        } catch {
          console.log("(unparseable) " + m[1].slice(0, 200));
        }
      });
    } catch (e) {
      console.log(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

run();
