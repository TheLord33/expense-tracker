import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Folio",
  description: "Personal & small business accounting",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Folio",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme on load */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('expense-tracker-theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className={`${geist.className} min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors`}>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
