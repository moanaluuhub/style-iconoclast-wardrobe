import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
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
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <h1 className="font-serif text-5xl mb-3 text-foreground">The Wardrobe</h1>
        <p className="text-muted-foreground text-sm mb-8 italic font-serif">
          Your private fashion archive
        </p>
        <div className="w-12 h-px bg-border mx-auto mb-8" />
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          A curated space for cataloguing what you own, tracking value over time, and composing outfits with intention.
        </p>
        <Button
          onClick={() => (window.location.href = getLoginUrl())}
          className="w-full tracking-widest text-xs uppercase"
        >
          Enter
        </Button>
      </div>
    </div>
  );
}
