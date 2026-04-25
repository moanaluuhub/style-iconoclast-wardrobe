import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shirt, Layers, BookOpen, BarChart2, LogOut, LogIn } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Wardrobe", icon: Shirt },
  { href: "/canvas", label: "Canvas", icon: Layers },
  { href: "/outfits", label: "Outfits", icon: BookOpen },
  { href: "/stats", label: "Statistics", icon: BarChart2 },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            {/* Wordmark */}
            <Link href="/">
              <span className="font-serif text-2xl tracking-tight text-foreground cursor-pointer select-none">
                The Wardrobe
              </span>
            </Link>

            {/* Nav Links */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const isActive = location === href;
                  return (
                    <Link key={href} href={href}>
                      <button
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm transition-all duration-150 ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon size={14} />
                        <span className="tracking-wide">{label}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Auth */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <span className="hidden sm:block text-xs text-muted-foreground tracking-wider uppercase">
                    {user?.name ?? ""}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <LogOut size={14} />
                    <span className="hidden sm:inline text-xs tracking-wide">Sign out</span>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => (window.location.href = getLoginUrl())}
                  className="gap-1.5 text-xs tracking-wide"
                >
                  <LogIn size={14} />
                  Sign in
                </Button>
              )}
            </div>
          </div>

          {/* Mobile nav */}
          {isAuthenticated && (
            <nav className="flex md:hidden items-center gap-1 pb-2 overflow-x-auto">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = location === href;
                return (
                  <Link key={href} href={href}>
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs whitespace-nowrap transition-all duration-150 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 mt-12">
        <div className="container">
          <p className="text-xs text-muted-foreground/60 tracking-widest uppercase text-center font-serif italic">
            The Wardrobe — Your private fashion archive
          </p>
        </div>
      </footer>
    </div>
  );
}
