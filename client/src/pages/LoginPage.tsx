import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

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
    <div className="min-h-[80vh] flex items-center justify-center bg-white">
      <div className="text-center max-w-xs px-6">
        {/* Wordmark */}
        <p className="text-[9px] tracking-[0.35em] uppercase text-[#ACABAB] mb-6">
          Private Collection
        </p>
        <h1 className="text-[28px] font-light text-black leading-none mb-1 tracking-tight">
          The Wardrobe
        </h1>
        <div className="w-8 h-px bg-black mx-auto my-6" />
        <p className="text-[12px] text-[#5A5A5A] mb-8 leading-relaxed tracking-wide">
          A curated space for cataloguing what you own, tracking value over time, and composing outfits with intention.
        </p>
        <button
          onClick={() => (window.location.href = getLoginUrl())}
          className="w-full bg-black text-white text-[10px] tracking-[0.22em] uppercase py-3.5 hover:bg-[#323232] transition-colors"
        >
          Enter
        </button>
        <p className="text-[9px] text-[#DEDEDE] mt-5 tracking-wide">
          Private — your data is never shared
        </p>
      </div>
    </div>
  );
}
