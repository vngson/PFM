import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Bungee, Lexend } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SkipLink } from "@/components/a11y/skip-link";
import { baseLocale, locales } from "@/paraglide/runtime";
import * as m from "@/paraglide/messages";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const heading = Bungee({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  weight: "400",
});

const body = Lexend({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Personal Finance Manager",
  description: m.app_tagline(),
};

// Resolve <html lang> server-side từ x-paraglide-locale header do proxy set
// sau khi phát hiện locale từ URL prefix. Header này ổn định trong cùng
// request (cookie mutation trên NextRequest không reach layout vì paraglide
// cloneRequestWithFallback tạo plain Request mới). Suppress warning vì client
// có thể set cookie trước khi script chạy.
async function resolveHtmlLang(): Promise<string> {
  try {
    const h = await headers();
    const value = h.get("x-paraglide-locale");
    if (value && (locales as readonly string[]).includes(value)) {
      return value;
    }
  } catch {}
  return baseLocale;
}

// Root layout cho mọi route (locale + non-locale như /_not-found).
// <html lang> resolved từ URL prefix server-side; không cần inline script.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontClassName = `${heading.variable} ${body.variable} ${geistMono.variable} h-full antialiased`;
  const htmlLang = await resolveHtmlLang();
  return (
    <html lang={htmlLang} className={fontClassName} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-body">
        <SkipLink />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}