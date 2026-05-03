import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Search, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import CartPanel from "./CartPanel";

const NAV_ITEMS = [
  { href: "/", label: "Wardrobe" },
  { href: "/canvas", label: "Build your Look" },
  { href: "/outfits", label: "Outfits" },
  { href: "/designers", label: "Designers" },
  { href: "/stats", label: "My Archive" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: cartEntries = [] } = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const cartCount = (cartEntries as any[]).length;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Top bar: wordmark + utility icons ─────────────────────────────── */}
      <div className="border-b border-[#DEDEDE]">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            {/* Left: hamburger (mobile) */}
            <div className="flex items-center gap-3 w-1/3">
              <button
                className="md:hidden flex flex-col gap-[5px] p-1"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Menu"
              >
                <span className="block w-5 h-px bg-black" />
                <span className="block w-5 h-px bg-black" />
                <span className="block w-5 h-px bg-black" />
              </button>
            </div>

            {/* Center: wordmark */}
            <Link href="/">
              <img
                src="/manus-storage/style-iconoclast-logo-new_5932eaf0.jpeg"
                alt="Style Iconoclast"
                className="h-[3.75rem] w-auto cursor-pointer select-none object-contain"
              />
            </Link>

            {/* Right: utility icons */}
            <div className="flex items-center justify-end gap-4 w-1/3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setCartOpen(true)}
                    className="relative flex items-center gap-1 text-black hover:opacity-60 transition-opacity"
                    title="Wishlist"
                  >
                    <ShoppingBag size={18} strokeWidth={1.5} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] w-4 h-4 flex items-center justify-center font-medium leading-none">
                        {cartCount > 9 ? "9+" : cartCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={logout}
                    className="hidden sm:flex items-center gap-1.5 text-black hover:opacity-60 transition-opacity"
                    title="Sign out"
                  >
                    <User size={18} strokeWidth={1.5} />
                    <span className="text-[10px] tracking-[0.14em] uppercase font-medium">
                      {user?.name?.split(" ")[0] ?? "Account"}
                    </span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => (window.location.href = getLoginUrl())}
                  className="flex items-center gap-1.5 text-black hover:opacity-60 transition-opacity"
                >
                  <User size={18} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-[0.14em] uppercase font-medium">Sign in</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Black navigation bar ───────────────────────────────────────────── */}
      {isAuthenticated && (
        <nav className="hidden md:block bg-black">
          <div className="container">
            <div className="flex items-center justify-center gap-0">
              {NAV_ITEMS.map(({ href, label }) => {
                const isActive = location === href;
                return (
                  <Link key={href} href={href}>
                    <button
                      className={`px-5 py-3 text-[11px] tracking-[0.16em] uppercase font-medium transition-colors duration-150 ${
                        isActive
                          ? "text-white border-b-2 border-white"
                          : "text-[#ACABAB] hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  </Link>
                );
              })}
              {user?.role === "admin" && (
                <Link href="/admin">
                  <button
                    className={`px-5 py-3 text-[11px] tracking-[0.16em] uppercase font-medium transition-colors duration-150 ${
                      location === "/admin"
                        ? "text-amber-400 border-b-2 border-amber-400"
                        : "text-amber-500/70 hover:text-amber-400"
                    }`}
                  >
                    Admin
                  </button>
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* ── Mobile nav drawer ─────────────────────────────────────────────── */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden bg-black">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href}>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block w-full text-left px-6 py-4 text-[11px] tracking-[0.16em] uppercase font-medium border-b border-white/10 ${
                    isActive ? "text-white" : "text-[#ACABAB] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              </Link>
            );
          })}
          {user?.role === "admin" && (
            <Link href="/admin">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={`block w-full text-left px-6 py-4 text-[11px] tracking-[0.16em] uppercase font-medium border-b border-white/10 ${
                  location === "/admin" ? "text-amber-400" : "text-amber-500/70 hover:text-amber-400"
                }`}
              >
                Admin
              </button>
            </Link>
          )}
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#DEDEDE] py-8 mt-16">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img
              src="/manus-storage/style-iconoclast-logo-new_5932eaf0.jpeg"
              alt="Style Iconoclast"
              className="h-12 w-auto object-contain"
            />
            <p className="text-[10px] tracking-[0.12em] uppercase text-[#ACABAB]">
              Your private fashion archive
            </p>
            {isAuthenticated && (
              <button
                onClick={logout}
                className="text-[10px] tracking-[0.12em] uppercase text-[#5A5A5A] hover:text-black transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Global cart panel */}
      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
