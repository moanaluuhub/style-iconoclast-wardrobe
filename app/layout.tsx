import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

// Every page in this app is client-side authenticated (Supabase session in
// localStorage) and renders nothing useful without the browser context.
// Disable static prerendering globally so the build doesn't try to evaluate
// `window` / `localStorage` on the server.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Style Iconoclast",
  description:
    "Your digital wardrobe. Organise what you own, shop what you want, and build your looks — all in one place.",
  openGraph: {
    title: "Style Iconoclast",
    description:
      "Your digital wardrobe. Organise what you own, shop what you want, and build your looks — all in one place.",
    siteName: "Style Iconoclast",
  },
  twitter: {
    card: "summary",
    title: "Style Iconoclast",
    description:
      "Your digital wardrobe. Organise what you own, shop what you want, and build your looks — all in one place.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;1,14..32,300;1,14..32,400&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
