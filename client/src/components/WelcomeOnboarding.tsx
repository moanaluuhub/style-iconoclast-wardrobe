import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shirt, Layers, MapPin, ShoppingBag, BookOpen, ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "si_onboarding_seen_v1";

const STEPS = [
  {
    icon: <Shirt size={40} strokeWidth={1.2} />,
    title: "Welcome to Style Iconoclast",
    subtitle: "Your digital wardrobe",
    body: "This is your private space to organise every piece you own, track what you want to buy, and build your personal style — all in one place.",
    cta: "Let me show you around",
  },
  {
    icon: <ShoppingBag size={40} strokeWidth={1.2} />,
    title: "My Wishlist & Cart",
    subtitle: "Shop with intention",
    body: "Save pieces you want to buy to your Wishlist. Add them to your Cart when you're ready to shop, and open all buy links at once with a single click.",
    cta: "Next",
  },
  {
    icon: <BookOpen size={40} strokeWidth={1.2} />,
    title: "My Archive",
    subtitle: "Pieces you already own",
    body: "Add every item from your real wardrobe — clothes, shoes, bags, accessories. Upload a photo, add the brand and price, and your collection is always at your fingertips.",
    cta: "Next",
  },
  {
    icon: <Layers size={40} strokeWidth={1.2} />,
    title: "Build Your Look",
    subtitle: "Create & save outfits",
    body: "Drag pieces onto the outfit canvas — Head, Top, Bottom, Shoes, Accessory — to compose complete looks. Save them by season and share them with friends.",
    cta: "Next",
  },
  {
    icon: <MapPin size={40} strokeWidth={1.2} />,
    title: "Travel Planner",
    subtitle: "Pack the perfect wardrobe",
    body: "Create a trip, set your dates, and assign a saved outfit to each day. Never overpack or forget an outfit again.",
    cta: "Start exploring",
  },
];

export default function WelcomeOnboarding({ forceOpen, onClose: onExternalClose }: { forceOpen?: boolean; onClose?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setOpen(true);
      return;
    }
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Small delay so the app finishes loading before the popup appears
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [forceOpen]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    onExternalClose?.();
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden border-0 rounded-none"
        style={{ fontFamily: "inherit" }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 text-[#999] hover:text-black transition-colors"
          aria-label="Skip"
        >
          <X size={16} />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center pt-6 pb-0 px-8">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-px transition-all duration-300 ${
                i === step ? "bg-black w-8" : "bg-[#D0D0D0] w-4"
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-10 pt-8 pb-10 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6 text-black">
            {current.icon}
          </div>

          {/* Eyebrow */}
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#999] mb-2">
            {current.subtitle}
          </p>

          {/* Title */}
          <h2 className="text-[22px] font-light tracking-[0.06em] uppercase text-black mb-4 leading-tight">
            {current.title}
          </h2>

          {/* Divider */}
          <div className="w-8 h-px bg-black mx-auto mb-5" />

          {/* Body */}
          <p className="text-[13px] text-[#555] leading-relaxed mb-8">
            {current.body}
          </p>

          {/* CTA button */}
          <Button
            onClick={next}
            className="w-full rounded-none bg-black text-white hover:bg-[#222] text-[11px] tracking-[0.14em] uppercase h-12"
          >
            {current.cta}
            {!isLast && <ArrowRight size={13} className="ml-2" />}
          </Button>

          {/* Skip link */}
          {!isLast && (
            <button
              onClick={dismiss}
              className="mt-4 text-[10px] tracking-[0.1em] uppercase text-[#AAA] hover:text-black transition-colors"
            >
              Skip intro
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
