import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { Suspense } from "react";
import { NavProgress } from "@/components/nav-progress";
import { SPLASH_SCRIPT, Splash } from "@/components/splash";
import "./globals.css";

// Fonte da marca, servida pelo próprio site (next/font baixa no build e hospeda junto).
const onest = Onest({ subsets: ["latin"], display: "swap", variable: "--font-onest" });

export const metadata: Metadata = {
  title: { default: "LOCAR Equipamentos", template: "%s · LOCAR" },
  description: "Controle de locação de equipamentos — LOCAR Equipamentos, Pacatuba-CE",
  applicationName: "LOCAR Equipamentos",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LOCAR", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f123f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={onest.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
      </head>
      <body>
        <Splash />
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}
