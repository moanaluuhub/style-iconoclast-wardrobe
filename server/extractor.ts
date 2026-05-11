// Product metadata extractor.
//
// Pipeline (LLM-free by default):
//   1. Per-site URL parser  — works even when the site blocks bot fetches
//      (NAP / Mr Porter / Outnet share a deterministic CDN image path).
//   2. HTML fetch (Googlebot UA → Chrome UA fallback, 8s timeout).
//   3. Probes against the HTML, in priority order:
//      a. JSON-LD Schema.org Product blocks   (most reliable when present)
//      b. OpenGraph meta tags                 (og:title, og:image, …)
//      c. Twitter card meta tags              (twitter:image, …)
//      d. <link rel="preload" as="image">     (last-resort hero image)
//   4. Optional LLM fallback (default OFF).   Set EXTRACT_USE_LLM=true to enable.
//
// The merge order is "best signal wins". Per-site parser provides a baseline
// (esp. for blocked sites); HTML probes overwrite when available; LLM fills
// remaining gaps if enabled.

import { invokeLLM } from "./_core/llm";

export type Category =
  | "tops"
  | "bottoms"
  | "outerwear"
  | "shoes"
  | "accessories"
  | "bags"
  | "dresses"
  | "suits"
  | "activewear"
  | "other";

export type ExtractedProduct = {
  title: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  color: string | null;
  category: Category | null;
  imageUrl: string | null;
  description: string | null;
  size: string | null;
};

export type ExtractDebug = {
  fetched: boolean;
  fetchStatus: number | null;
  fetchUa: string | null;
  htmlBytes: number;
  challenge: boolean;
  source: {
    title: string | null;
    brand: string | null;
    price: string | null;
    image: string | null;
    description: string | null;
  };
  llmUsed: boolean;
  errors: string[];
};

const EMPTY_PRODUCT: ExtractedProduct = {
  title: null,
  brand: null,
  price: null,
  currency: null,
  color: null,
  category: null,
  imageUrl: null,
  description: null,
  size: null,
};

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
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  },
];

export async function extractFromUrl(
  inputUrl: string
): Promise<{ product: ExtractedProduct; debug: ExtractDebug }> {
  const debug: ExtractDebug = {
    fetched: false,
    fetchStatus: null,
    fetchUa: null,
    htmlBytes: 0,
    challenge: false,
    source: { title: null, brand: null, price: null, image: null, description: null },
    llmUsed: false,
    errors: [],
  };

  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    debug.errors.push("invalid URL");
    return { product: { ...EMPTY_PRODUCT }, debug };
  }

  // ── 1. Per-site URL parser (no fetch) ─────────────────────────────────────
  const sitePreParsed = parseKnownSite(url) ?? {};

  // ── 2. Fetch HTML with UA fallback ────────────────────────────────────────
  const fetched = await tryFetch(inputUrl);
  debug.fetched = !!fetched.html;
  debug.fetchStatus = fetched.status;
  debug.fetchUa = fetched.ua;
  debug.htmlBytes = fetched.html?.length ?? 0;
  debug.challenge = fetched.challenge;
  if (fetched.error) debug.errors.push(`fetch: ${fetched.error}`);

  // ── 3. HTML probes (only if we have real HTML) ────────────────────────────
  let fromJsonLd: Partial<ExtractedProduct> = {};
  let fromOg: Partial<ExtractedProduct> = {};
  let fromTwitter: Partial<ExtractedProduct> = {};
  let fromPreload: Partial<ExtractedProduct> = {};
  if (fetched.html) {
    fromJsonLd = probeJsonLd(fetched.html);
    fromOg = probeOgTags(fetched.html);
    fromTwitter = probeTwitterCard(fetched.html);
    fromPreload = probePreloadImage(fetched.html);
    if (fromJsonLd.title || fromJsonLd.imageUrl) debug.source.title = "json-ld";
    if (fromJsonLd.imageUrl) debug.source.image = "json-ld";
    if (!debug.source.title && fromOg.title) debug.source.title = "og";
    if (!debug.source.image && fromOg.imageUrl) debug.source.image = "og";
    if (!debug.source.image && fromTwitter.imageUrl) debug.source.image = "twitter";
    if (!debug.source.image && fromPreload.imageUrl) debug.source.image = "preload";
  }

  // ── 4. Merge: site → JSON-LD → OG → Twitter → preload ─────────────────────
  // Higher-priority sources only override when they have a value.
  let merged: ExtractedProduct = mergeNonEmpty(
    { ...EMPTY_PRODUCT },
    sitePreParsed,
    fromJsonLd,
    fromOg,
    fromTwitter,
    fromPreload
  );

  if (!debug.source.image && merged.imageUrl && sitePreParsed.imageUrl === merged.imageUrl) {
    debug.source.image = "site-cdn";
  }
  if (!debug.source.title && merged.title && sitePreParsed.title === merged.title) {
    debug.source.title = "site-slug";
  }

  // ── 5. Optional LLM fallback ──────────────────────────────────────────────
  if (process.env.EXTRACT_USE_LLM === "true" && hasMissingFields(merged)) {
    try {
      const llmFilled = await llmFill(inputUrl, fetched.html, merged);
      merged = mergeNonEmpty(merged, llmFilled);
      debug.llmUsed = true;
    } catch (err) {
      debug.errors.push(
        `llm: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Normalize category onto our enum
  if (merged.category) {
    merged.category = normalizeCategory(merged.category) ?? null;
  }
  if (!merged.currency) merged.currency = "USD";

  return { product: merged, debug };
}

// ─── Per-site parsers ────────────────────────────────────────────────────────

const NAP_GROUP_HOSTS = new Set([
  "net-a-porter.com",
  "mrporter.com",
  "theoutnet.com",
]);

function parseKnownSite(url: URL): Partial<ExtractedProduct> | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (NAP_GROUP_HOSTS.has(host)) return parseNapGroup(url, host);
  if (host === "zara.com") return parseZara(url);
  return null;
}

function parseZara(url: URL): Partial<ExtractedProduct> | null {
  // Path shape: /<lang>/<locale>/<slug>-p<numericId>.html
  // Zara is protected by Akamai Bot Manager — server-side fetches return a
  // JavaScript challenge page, so we extract what we can from the URL only.
  // Image cannot be derived (Zara CDN uses opaque hashes).
  const m = url.pathname.match(/\/([a-z0-9-]+?)-p\d+\.html$/i);
  if (!m) return null;
  const slug = m[1];
  return {
    brand: "Zara",
    title: titleCase(slug),
    category: mapZaraCategory(slug),
  };
}

function mapZaraCategory(slug: string): Category {
  const s = slug.toLowerCase();
  if (/dress/.test(s)) return "dresses";
  if (/coat|jacket|blazer|parka|trench|puffer|outerwear/.test(s)) return "outerwear";
  if (/shoe|sneaker|boot|sandal|heel|loafer|pump|mule|flat/.test(s)) return "shoes";
  if (/bag|tote|clutch|backpack|crossbody|wallet|purse/.test(s)) return "bags";
  if (/skirt|trouser|pant|jean|short|legging/.test(s)) return "bottoms";
  if (/shirt|blouse|tee|t-shirt|sweater|knit|cardigan|tank|polo|top/.test(s)) return "tops";
  if (/suit/.test(s)) return "suits";
  if (/accessor|jewel|hat|scarf|belt|sunglass|glove/.test(s)) return "accessories";
  return "other";
}

function parseNapGroup(url: URL, host: string): Partial<ExtractedProduct> | null {
  // NAP/Outnet:  /<lang>/shop/product/<brand>/<cat>/<sub>/<slug>/<id>
  // Mr Porter:   /<lang>/mens/product/<brand>/<cat>/<sub>/<slug>/<id>
  // <lang> can be "en-us", "fr-fr", etc., or absent.
  const m = url.pathname.match(
    /^\/(?:[a-z]{2}-[a-z]{2}\/)?(?:shop|mens|womens)\/product\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/(\d{10,})/i
  );
  if (!m) return null;
  const [, brandSlug, cat, sub, nameSlug, id] = m;
  return {
    brand: titleCase(brandSlug),
    title: titleCase(nameSlug),
    category: mapNapGroupCategory(cat, sub),
    imageUrl: `https://www.${host}/variants/images/${id}/in/w2000_q60.jpg`,
  };
}

function mapNapGroupCategory(cat: string, sub: string): Category {
  const s = `${cat}/${sub}`.toLowerCase();
  if (/dress/.test(s)) return "dresses";
  if (/coat|jacket|outerwear|parka|puffer|trench/.test(s)) return "outerwear";
  if (/shoe|sneaker|boot|sandal|heel|loafer|pump|mule|flat|slipper/.test(s)) return "shoes";
  if (/bag|tote|clutch|backpack|crossbody|wallet|purse/.test(s)) return "bags";
  if (/skirt|trouser|pant|jean|short|legging/.test(s)) return "bottoms";
  if (/top|shirt|blouse|tee|sweater|knit|cardigan|tank|polo/.test(s)) return "tops";
  if (/suit|tailoring/.test(s)) return "suits";
  if (/active|sport|gym|yoga|running/.test(s)) return "activewear";
  if (/accessor|jewel|hat|scarf|belt|sunglass|glove/.test(s)) return "accessories";
  return "other";
}

function titleCase(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

async function tryFetch(
  url: string
): Promise<{
  html: string | null;
  status: number | null;
  ua: string | null;
  challenge: boolean;
  error: string | null;
}> {
  for (const { label, headers } of HEADERS_TRIES) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      });
      const text = await res.text();
      const challenge = isChallengePage(text);
      if (!res.ok) {
        if (label === HEADERS_TRIES[HEADERS_TRIES.length - 1].label) {
          return { html: null, status: res.status, ua: label, challenge, error: null };
        }
        continue;
      }
      if (challenge) {
        if (label === HEADERS_TRIES[HEADERS_TRIES.length - 1].label) {
          return { html: null, status: res.status, ua: label, challenge: true, error: null };
        }
        continue;
      }
      return { html: text, status: res.status, ua: label, challenge: false, error: null };
    } catch (e) {
      if (label === HEADERS_TRIES[HEADERS_TRIES.length - 1].label) {
        return {
          html: null,
          status: null,
          ua: label,
          challenge: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }
  }
  return { html: null, status: null, ua: null, challenge: false, error: "all attempts failed" };
}

function isChallengePage(text: string): boolean {
  return (
    text.length < 800 ||
    text.includes("_cf_chl_opt") ||
    text.includes("cf-browser-verification") ||
    text.includes("Enable JavaScript and cookies") ||
    text.includes("window.isBotPage")
  );
}

// ─── JSON-LD probe ───────────────────────────────────────────────────────────

function probeJsonLd(html: string): Partial<ExtractedProduct> {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      const product = findProduct(data);
      if (product) {
        const mapped = mapJsonLdProduct(product);
        if (Object.values(mapped).some((v) => v !== null && v !== undefined)) {
          return mapped;
        }
      }
    } catch {
      /* malformed block, skip */
    }
  }
  return {};
}

const PRODUCT_TYPES = new Set(["Product", "ProductGroup", "IndividualProduct"]);

function findProduct(node: any): Record<string, any> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const x of node) {
      const r = findProduct(x);
      if (r) return r;
    }
    return null;
  }
  if (typeof node === "object") {
    const t = node["@type"];
    const isProduct =
      (typeof t === "string" && PRODUCT_TYPES.has(t)) ||
      (Array.isArray(t) && t.some((x) => typeof x === "string" && PRODUCT_TYPES.has(x)));
    if (isProduct) return node;
    if (node["@graph"]) {
      const r = findProduct(node["@graph"]);
      if (r) return r;
    }
    for (const v of Object.values(node)) {
      if (v && typeof v === "object") {
        const r = findProduct(v);
        if (r) return r;
      }
    }
  }
  return null;
}

function pickJsonLdImage(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const u = pickJsonLdImage(item);
      if (u) return u;
    }
    return null;
  }
  if (typeof raw === "object") {
    if (typeof raw.contentUrl === "string") return raw.contentUrl;
    if (typeof raw.url === "string") return raw.url;
  }
  return null;
}

function mapJsonLdProduct(p: Record<string, any>): Partial<ExtractedProduct> {
  const imageUrl = pickJsonLdImage(p.image);

  const brand =
    typeof p.brand === "string"
      ? p.brand
      : typeof p.brand?.name === "string"
        ? p.brand.name
        : null;

  // Offers may be an Offer, an array of Offers, or an AggregateOffer container.
  const offers = Array.isArray(p.offers) ? p.offers[0] : p.offers;
  const aggregate =
    offers?.["@type"] === "AggregateOffer"
      ? offers
      : p.offers?.["@type"] === "AggregateOffer"
        ? p.offers
        : null;
  const priceRaw =
    offers?.price ??
    aggregate?.lowPrice ??
    aggregate?.highPrice ??
    offers?.lowPrice ??
    null;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
        ? parseFloat(priceRaw.replace(/,/g, ""))
        : null;
  const currency =
    typeof offers?.priceCurrency === "string"
      ? offers.priceCurrency
      : typeof aggregate?.priceCurrency === "string"
        ? aggregate.priceCurrency
        : null;

  // Color may live on the product itself or on the first offer/variant.
  const color =
    (typeof p.color === "string" && p.color) ||
    (typeof offers?.color === "string" && offers.color) ||
    null;

  return stripUndef({
    title: typeof p.name === "string" ? p.name : null,
    brand,
    imageUrl,
    description: typeof p.description === "string" ? p.description : null,
    color,
    price: Number.isFinite(price) ? (price as number) : null,
    currency,
  });
}

// ─── OG / Twitter / preload probes ───────────────────────────────────────────

function probeOgTags(html: string): Partial<ExtractedProduct> {
  const get = (name: string) => readMeta(html, [`og:${name}`], "property", name);
  const title = get("title");
  const image = get("image");
  const description = get("description");

  const priceMatch =
    html.match(/property=["']product:price:amount["'][^>]+content=["']([\d.,]+)["']/i) ||
    html.match(/itemprop=["']price["'][^>]+content=["']([\d.,]+)["']/i) ||
    html.match(/"price"\s*:\s*"([\d.,]+)"/i);
  const currencyMatch =
    html.match(/property=["']product:price:currency["'][^>]+content=["']([A-Z]{3})["']/i) ||
    html.match(/itemprop=["']priceCurrency["'][^>]+content=["']([A-Z]{3})["']/i);

  return stripUndef({
    title,
    imageUrl: image,
    description,
    price: priceMatch?.[1] ? parseFloat(priceMatch[1].replace(/,/g, "")) || null : null,
    currency: currencyMatch?.[1] ?? null,
  });
}

function probeTwitterCard(html: string): Partial<ExtractedProduct> {
  const image = readMeta(html, ["twitter:image", "twitter:image:src"], "name", null);
  const title = readMeta(html, ["twitter:title"], "name", null);
  const description = readMeta(html, ["twitter:description"], "name", null);
  return stripUndef({ imageUrl: image, title, description });
}

function probePreloadImage(html: string): Partial<ExtractedProduct> {
  const m = html.match(
    /<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/i
  );
  return m?.[1] ? { imageUrl: m[1] } : {};
}

function readMeta(
  html: string,
  attrValues: string[],
  attrA: "property" | "name",
  fallbackName: string | null
): string | null {
  for (const v of attrValues) {
    const patterns = [
      new RegExp(
        `<meta[^>]+${attrA}=["']${escapeRe(v)}["'][^>]+content=["']([^"']+)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+${attrA}=["']${escapeRe(v)}["']`,
        "i"
      ),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1].trim();
    }
  }
  if (fallbackName) {
    // also try the alt attribute (e.g. name= instead of property=)
    const other = attrA === "property" ? "name" : "property";
    const patterns = [
      new RegExp(
        `<meta[^>]+${other}=["']${escapeRe(fallbackName)}["'][^>]+content=["']([^"']+)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+${other}=["']${escapeRe(fallbackName)}["']`,
        "i"
      ),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1].trim();
    }
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── LLM fallback (opt-in) ───────────────────────────────────────────────────

async function llmFill(
  url: string,
  html: string | null,
  current: ExtractedProduct
): Promise<Partial<ExtractedProduct>> {
  const parsed = new URL(url);
  const hostname = parsed.hostname.replace(/^www\./, "");
  const urlWords = parsed.pathname
    .replace(/[/_-]+/g, " ")
    .replace(/\.(html|aspx|php|htm)$/i, "")
    .replace(/\d{8,}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const visibleText =
    html && html.length > 800
      ? html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s{2,}/g, " ")
          .slice(0, 2000)
      : "";

  const knownLines = Object.entries(current)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const contextLines = [
    `URL: ${url}`,
    `Site: ${hostname}`,
    `URL path words: ${urlWords}`,
    knownLines ? `Already known fields:\n${knownLines}` : "",
    visibleText ? `Page text excerpt: ${visibleText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You fill in missing fields about a luxury fashion product. " +
          "Use ONLY information visible in the URL slug or the provided context. " +
          "Never invent image URLs — leave imageUrl null if you cannot see one verbatim. " +
          "Return ONLY valid JSON.",
      },
      {
        role: "user",
        content:
          `Fill in any fields you can determine from the context below. ` +
          `Leave fields you cannot determine as null.\n\n${contextLines}\n\n` +
          `Schema: { title, brand, price (number|null), currency (string|null), color, ` +
          `category (one of tops|bottoms|outerwear|shoes|accessories|bags|dresses|suits|activewear|other), ` +
          `imageUrl, description (max 80 chars), size }`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "product_fill",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: ["string", "null"] },
            brand: { type: ["string", "null"] },
            price: { type: ["number", "null"] },
            currency: { type: ["string", "null"] },
            color: { type: ["string", "null"] },
            category: { type: ["string", "null"] },
            imageUrl: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            size: { type: ["string", "null"] },
          },
          required: [
            "title", "brand", "price", "currency", "color",
            "category", "imageUrl", "description", "size",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) return {};
  const parsedOut = typeof content === "string" ? JSON.parse(content) : content;
  return stripUndef(parsedOut);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mergeNonEmpty<T extends Record<string, any>>(
  base: T,
  ...sources: Array<Partial<T> | undefined>
): T {
  const out: Record<string, any> = { ...base };
  for (const src of sources) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      if (v !== null && v !== undefined && v !== "" && (out[k] === null || out[k] === undefined)) {
        out[k] = v;
      }
    }
  }
  return out as T;
}

function stripUndef<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

function hasMissingFields(p: ExtractedProduct): boolean {
  return (
    !p.title ||
    !p.brand ||
    !p.imageUrl ||
    !p.category ||
    !p.description ||
    !p.color ||
    !p.price
  );
}

const VALID_CATEGORIES = new Set<Category>([
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "bags",
  "dresses",
  "suits",
  "activewear",
  "other",
]);

function normalizeCategory(c: string): Category | null {
  const lower = c.toLowerCase().trim();
  if (VALID_CATEGORIES.has(lower as Category)) return lower as Category;
  // Common LLM/JSON-LD aliases
  if (/dress/.test(lower)) return "dresses";
  if (/coat|jacket|outerwear|parka|trench|puffer/.test(lower)) return "outerwear";
  if (/shoe|sneaker|boot|sandal|heel|loafer|pump/.test(lower)) return "shoes";
  if (/bag|tote|clutch|backpack|wallet/.test(lower)) return "bags";
  if (/pant|trouser|skirt|jean|short|legging/.test(lower)) return "bottoms";
  if (/top|shirt|blouse|tee|sweater|knit/.test(lower)) return "tops";
  if (/suit|tailoring/.test(lower)) return "suits";
  if (/active|sport|gym/.test(lower)) return "activewear";
  if (/accessor|jewel|hat|scarf|belt|sunglass/.test(lower)) return "accessories";
  return "other";
}
