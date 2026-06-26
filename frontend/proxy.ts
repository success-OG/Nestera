import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "es"];
const defaultLocale = "en";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const pathnameLocale = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (request.headers.get("x-nestera-locale") && !pathnameLocale) {
    return NextResponse.next();
  }

  if (!pathnameLocale) {
    const preferredLocale =
      request.headers
        .get("accept-language")
        ?.split(",")
        .map((part) => part.trim().slice(0, 2).toLowerCase())
        .find((locale) => locales.includes(locale)) ?? defaultLocale;

    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nestera-locale", pathnameLocale);

  const url = request.nextUrl.clone();
  url.pathname = pathname.replace(`/${pathnameLocale}`, "") || "/";

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico)$).*)",
  ],
};
