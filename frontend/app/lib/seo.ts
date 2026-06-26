import { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nestera.com";
export const SITE_NAME = "Nestera";
export const SITE_DESCRIPTION = "Decentralized savings & investment platform on Stellar";

interface PageMetadataOptions {
  title: string;
  description: string;
  url?: string;
  locale?: string;
  alternateLanguages?: Record<string, string>;
}

export function generatePageMetadata({
  title,
  description,
  url = "/",
  locale = "en",
  alternateLanguages,
}: PageMetadataOptions): Metadata {
  const fullUrl = `${SITE_URL}${url}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: alternateLanguages
      ? {
        languages: alternateLanguages,
      }
      : undefined,
  };
}
