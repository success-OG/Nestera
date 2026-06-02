import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import IntlProvider from "./i18n/provider";
import AnalyticsProvider from "./components/AnalyticsProvider";
import MonitoringProvider from "./components/MonitoringProvider";
import { StructuredData } from "./components/StructuredData";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import InstallPrompt from "./components/InstallPrompt";
import {
  generatePageMetadata,
  SITE_URL,
  getOrganizationSchema,
  getWebsiteSchema,
} from "./lib/seo";
import en from "./locales/en.json";
import es from "./locales/es.json";

const messages = { en, es };
const defaultLocale = "en";
const rtlLocales = ["ar", "he", "fa", "ur"];

const getLocale = async () => {
  const locale = (await headers()).get("x-nestera-locale") ?? defaultLocale;
  return locale in messages ? (locale as keyof typeof messages) : defaultLocale;
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const metadata = messages[locale].metadata;

  return generatePageMetadata({
    title: metadata.title,
    description: metadata.description,
    url: "/",
    locale,
    alternateLanguages: {
      en: `${SITE_URL}/en`,
      es: `${SITE_URL}/es`,
    },
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} dir={rtlLocales.includes(locale) ? "rtl" : "ltr"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#00d4c0" />

        {/* PWA / installability */}
        <link rel="manifest" href="/manifest.json" />

        {/* Apple PWA meta */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nestera" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.svg" />

        {/* Apple splash screens (portrait) */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-430x932.svg"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-393x852.svg"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-390x844.svg"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-375x812.svg"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
          href="/splash/splash-414x896.svg"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
          href="/splash/splash-375x667.svg"
        />

        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#061a1a" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.svg" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <StructuredData schema={[getOrganizationSchema(), getWebsiteSchema()]} />
      </head>
      <body className="bg-slate-950 text-white">
        <IntlProvider locale={locale} messages={messages[locale]}>
          {children}
          <Suspense fallback={null}>
            <AnalyticsProvider />
            <MonitoringProvider />
          </Suspense>
          <ServiceWorkerRegistration />
          <InstallPrompt />
        </IntlProvider>
      </body>
    </html>
  );
}
