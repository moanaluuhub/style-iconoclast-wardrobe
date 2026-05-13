"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import superjson from "superjson";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          async headers() {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            return token ? { authorization: `Bearer ${token}` } : {};
          },
          fetch(input, init) {
            return globalThis.fetch(input, {
              ...(init ?? {}),
              credentials: "include",
            });
          },
        }),
      ],
    })
  );

  useEffect(() => {
    const redirectIfUnauthorized = (error: unknown) => {
      if (!(error instanceof TRPCClientError)) return;
      if (error.message !== UNAUTHED_ERR_MSG) return;
      router.replace("/login");
    };

    const unsubQuery = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        redirectIfUnauthorized(event.query.state.error);
        console.error("[API Query Error]", event.query.state.error);
      }
    });
    const unsubMutation = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        redirectIfUnauthorized(event.mutation.state.error);
        console.error("[API Mutation Error]", event.mutation.state.error);
      }
    });
    return () => {
      unsubQuery();
      unsubMutation();
    };
  }, [queryClient, router]);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: "0.875rem",
                    background: "oklch(0.965 0.007 80)",
                    border: "1px solid oklch(0.87 0.01 80)",
                    color: "oklch(0.18 0.01 60)",
                  },
                }}
              />
              <AppShell>{children}</AppShell>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
