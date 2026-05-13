"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errParam = url.searchParams.get("error_description") || url.searchParams.get("error");
        if (errParam) throw new Error(errParam);

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          // Implicit flow: Supabase JS auto-detects session in URL hash.
          await supabase.auth.getSession();
        }

        if (cancelled) return;
        await utils.auth.me.invalidate();
        window.location.replace("/");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Authentication failed";
        // eslint-disable-next-line no-console
        console.error("[AuthCallback]", e);
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [utils]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      {error ? (
        <div>
          <p className="text-sm text-red-600 mb-2">Sign-in failed</p>
          <p className="text-xs text-stone-500">{error}</p>
          <a href="/login" className="mt-4 inline-block underline text-sm">
            Back to login
          </a>
        </div>
      ) : (
        <p className="text-sm text-stone-500">Signing you in…</p>
      )}
    </div>
  );
}
