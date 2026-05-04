import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

const HERO_IMG = "/manus-storage/hero-editorial_38095c00.jpg";
const FEAT_1 = "/manus-storage/feature-1_c584b198.jpg";
const FEAT_2 = "/manus-storage/feature-2_e3cd5ccd.jpg";
const FEAT_3 = "/manus-storage/feature-3_5b59c646.jpg";

const MARQUEE_TEXT = "ARCHIVE · CATALOGUE · COMPOSE · TRACK · CURATE · ARCHIVE · CATALOGUE · COMPOSE · TRACK · CURATE · ";

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, loading]);

  return (
    <div className="bg-white overflow-x-hidden">

      {/* ── HERO: Asymmetric split ─────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col md:flex-row">
        {/* Left: editorial image */}
        <div className="relative w-full md:w-[55%] h-[60vh] md:h-screen overflow-hidden">
          <img
            src={HERO_IMG}
            alt="Style Iconoclast editorial"
            className="absolute inset-0 w-full h-full object-cover object-top grayscale"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-8 left-8">
            <span className="text-[9px] tracking-[0.3em] uppercase text-white/60">
              Private Collection — SS 2025
            </span>
          </div>
        </div>

        {/* Right: copy + CTA */}
        <div
          className="w-full md:w-[45%] flex flex-col justify-center px-10 md:px-16 py-16 md:py-0 relative"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23fafafa'/%3E%3Ccircle cx='1' cy='1' r='0.6' fill='%23e8e8e8'/%3E%3C/svg%3E\")",
          }}
        >
          <p className="text-[9px] tracking-[0.35em] uppercase text-[#ACABAB] mb-6">
            Your Digital Wardrobe
          </p>
          <img
            src="/manus-storage/style-iconoclast-logo-new_5932eaf0.jpeg"
            alt="Style Iconoclast"
            className="w-full max-w-[57.2rem] object-contain mb-6"
          />
          <div className="w-10 h-px bg-black mb-8" />
          <p className="text-[13px] text-[#5A5A5A] mb-10 leading-relaxed tracking-wide max-w-xs">
            Your digital wardrobe. Organise what you own, shop what you want, and build your looks — all in one place.
          </p>
          <button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full max-w-xs bg-black text-white text-[10px] tracking-[0.22em] uppercase py-4 hover:bg-[#222] transition-colors"
          >
            Enter the Archive
          </button>
          <p className="text-[9px] text-[#DEDEDE] mt-5 tracking-wide">
            Private — your data is never shared
          </p>
        </div>
      </section>

      {/* ── MARQUEE TICKER ────────────────────────────────────────────────── */}
      <div className="bg-black py-3 overflow-hidden">
        <div className="flex whitespace-nowrap" style={{ animation: "marquee 28s linear infinite" }}>
          <span className="text-[10px] tracking-[0.28em] uppercase text-white/60 pr-0">{MARQUEE_TEXT}</span>
          <span className="text-[10px] tracking-[0.28em] uppercase text-white/60 pr-0">{MARQUEE_TEXT}</span>
        </div>
      </div>

      {/* ── FEATURE ROW ───────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB] text-center mb-16">
            What it does
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#DEDEDE]">
            {[
              {
                img: FEAT_1,
                icon: "01",
                title: "Archive",
                desc: "Catalogue every piece you own — brand, price, category, and purchase date — in one private, searchable wardrobe.",
              },
              {
                img: FEAT_2,
                icon: "02",
                title: "Track",
                desc: "Monitor current value, cost-per-wear, and price history over time. Know exactly what your wardrobe is worth.",
              },
              {
                img: FEAT_3,
                icon: "03",
                title: "Compose",
                desc: "Build outfits on a digital canvas, tag them by season and occasion, and save your best looks for reference.",
              },
            ].map((f, i) => (
              <div
                key={f.icon}
                className={`flex flex-col ${
                  i < 2 ? "md:border-r border-[#DEDEDE]" : ""
                } border-b md:border-b-0 border-[#DEDEDE] last:border-b-0`}
              >
                <div className="h-64 overflow-hidden">
                  <img
                    src={f.img}
                    alt={f.title}
                    className="w-full h-full object-cover object-top grayscale hover:grayscale-0 transition-all duration-700"
                  />
                </div>
                <div className="p-8">
                  <span className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB] block mb-3">{f.icon}</span>
                  <h3 className="text-[15px] tracking-[0.12em] uppercase font-light text-black mb-3">{f.title}</h3>
                  <p className="text-[11px] text-[#5A5A5A] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section
        className="py-20 md:py-28 px-6"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23fafafa'/%3E%3Ccircle cx='1' cy='1' r='0.6' fill='%23e8e8e8'/%3E%3C/svg%3E\")",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-[9px] tracking-[0.3em] uppercase text-[#ACABAB] text-center mb-16">
            How it works
          </p>
          <div className="space-y-0">
            {[
              {
                step: "1",
                title: "Add your pieces",
                desc: "Paste a product URL to auto-extract title, brand, price, and category — or add items manually with a photo.",
              },
              {
                step: "2",
                title: "Build your looks",
                desc: "Drag pieces onto the canvas to compose outfits. Tag each look by season, occasion, or mood.",
              },
              {
                step: "3",
                title: "Track your archive",
                desc: "Monitor cost-per-wear, total wardrobe value, and price changes over time in your personal archive.",
              },
            ].map((s, i) => (
              <div
                key={s.step}
                className={`flex gap-8 md:gap-16 items-start py-10 ${
                  i < 2 ? "border-b border-[#DEDEDE]" : ""
                }`}
              >
                <span
                  className="text-[42px] font-light text-[#DEDEDE] leading-none shrink-0 w-12 text-right"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {s.step}
                </span>
                <div>
                  <h3 className="text-[13px] tracking-[0.14em] uppercase font-medium text-black mb-2">{s.title}</h3>
                  <p className="text-[12px] text-[#5A5A5A] leading-relaxed max-w-md">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────────────────────────────── */}
      <section className="bg-black py-20 md:py-28 px-6 text-center">
        <img
          src="/manus-storage/style-iconoclast-logo-new_5932eaf0.jpeg"
          alt="Style Iconoclast"
          className="h-[8.58rem] w-auto object-contain mx-auto mb-6 invert"
        />
        <h2 className="text-[28px] md:text-[36px] font-light text-white tracking-[0.08em] uppercase mb-8">
          Start your wardrobe
        </h2>
        <button
          onClick={() => (window.location.href = getLoginUrl())}
          className="border border-white text-white text-[10px] tracking-[0.22em] uppercase px-12 py-4 hover:bg-white hover:text-black transition-colors duration-300"
        >
          Enter
        </button>
      </section>

      {/* Marquee keyframe */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
