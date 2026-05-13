"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/hooks/useAuth";
import { getLoginUrl } from "@/lib/const";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function CollabAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"idle" | "accepting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [ownerId, setOwnerId] = useState<number | null>(null);

  const token = searchParams.get("token") ?? "";

  const accept = trpc.collaborators.accept.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      setOwnerId(data.ownerId);
      setTimeout(() => router.push(`/shared-wishlist/${data.ownerId}`), 2000);
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message ?? "This invite link is invalid or has already been used.");
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!token) { setStatus("error"); setErrorMsg("No invite token found in the URL."); return; }
    if (status === "idle") {
      setStatus("accepting");
      accept.mutate({ token });
    }
  }, [authLoading, isAuthenticated, token]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ACABAB]" size={24} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-[11px] tracking-[0.22em] uppercase text-[#5A5A5A] mb-2">Wishlist Invite</h1>
          <h2 className="text-2xl font-light tracking-wide text-black mb-4">You have been invited</h2>
          <p className="text-[12px] text-[#5A5A5A] mb-8 leading-relaxed">
            Sign in to accept the invitation and view the shared wishlist.
          </p>
          <a
            href={`${getLoginUrl()}?returnPath=${encodeURIComponent("/collab/accept?token=" + token)}`}
            className="block w-full bg-black text-white text-[10px] tracking-[0.14em] uppercase py-3 hover:bg-[#222] transition-colors text-center"
          >
            Sign In to Accept
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {(status === "idle" || status === "accepting") && (
          <>
            <Loader2 className="animate-spin text-[#ACABAB] mx-auto mb-4" size={32} />
            <p className="text-[12px] text-[#5A5A5A] tracking-wide">Accepting invitation...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="text-green-500 mx-auto mb-4" size={40} />
            <h2 className="text-xl font-light tracking-wide text-black mb-2">Invitation Accepted</h2>
            <p className="text-[12px] text-[#5A5A5A]">Redirecting you to the shared wishlist...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="text-red-400 mx-auto mb-4" size={40} />
            <h2 className="text-xl font-light tracking-wide text-black mb-2">Invalid Invite</h2>
            <p className="text-[12px] text-[#5A5A5A] mb-6">{errorMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="bg-black text-white text-[10px] tracking-[0.14em] uppercase px-6 py-2.5 hover:bg-[#222] transition-colors"
            >
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
