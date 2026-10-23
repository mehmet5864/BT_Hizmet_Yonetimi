import { DARK_THEMES } from "@/lib/theme";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";

import { AppChrome } from "@/components/app-chrome";
import { EnPhraseTranslator } from "@/components/en-phrase-translator";
import { I18nProvider } from "@/components/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getTranslator } from "@/lib/i18n";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { getSystemSettings } from "@/lib/settings-store";
import { cn } from "@/lib/utils";
import "./globals.css";

// Derleme sırasında veritabanı yok; sayfalar istek anında üretilir.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("appName"),
    description: t("tagline"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [settings, i18n] = await Promise.all([
    getSystemSettings().catch(() => DEFAULT_SETTINGS),
    getTranslator(),
  ]);
  const theme = settings.appearance.theme;
  const dark = DARK_THEMES.includes(theme);

  return (
    <html
      lang={i18n.locale}
      dir={i18n.dir}
      data-theme={theme}
      data-pattern={settings.appearance.pattern}
      className={cn(
        geistSans.variable,
        geistMono.variable,
        notoArabic.variable,
        "h-full antialiased",
        dark && "dark",
      )}
    >
      <body className="min-h-full font-sans">
        <I18nProvider locale={i18n.locale}>
          <TooltipProvider delayDuration={200}>
            <AppChrome>{children}</AppChrome>
            <EnPhraseTranslator />
            <Toaster position={i18n.dir === "rtl" ? "top-left" : "top-right"} richColors />
          </TooltipProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
