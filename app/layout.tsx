import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "v-proxies Tools", template: "%s | v-proxies Tools" },
  description: "Free proxy tools — proxy tester, IP checker, DNS leak test and more.",
  metadataBase: new URL("https://tools.vproxies.app"),
  icons: { icon: "/logo.svg", shortcut: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 w-full border-b border-[#111] bg-[#0d0d0d]/90 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/logo.svg" alt="v-proxies logo" width={22} height={22} className="rounded-md" />
              <span className="text-sm font-bold text-white">v-proxies</span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e30' }}
              >
                tools
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/tools/proxy-tester"
                className="text-xs text-[#9ca3af] hover:text-white transition-colors font-medium"
              >
                Proxy Tester
              </Link>
              <a
                href="https://v-proxies.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: '#22c55e', color: '#000' }}
              >
                Get Proxies
              </a>
            </nav>
          </div>
        </header>

        {children}

        <footer className="border-t border-[#111] py-8 mt-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6b7280]">
            <p>
              &copy; {new Date().getFullYear()}{" "}
              <a
                href="https://v-proxies.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                v-proxies
              </a>
              {" "}— Free proxy tools, no sign-up required.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-end gap-4">
              <a
                href="https://github.com/DishantSinghDev2/v-proxies-tools"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Open Source
              </a>
              <a
                href="https://github.com/DishantSinghDev2/vp-proxy-switcher"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Browser Extension
              </a>
              <a
                href="https://v-proxies.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Privacy
              </a>
              <a
                href="https://v-proxies.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
