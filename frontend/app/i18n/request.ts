import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

const locales = ['en', 'es'] as const;
type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const headerLocale = (await headers()).get('x-nestera-locale');
  const locale = locales.includes(headerLocale as Locale) ? (headerLocale as Locale) : 'en';

  // next-intl expects both `locale` and `messages` to always be resolvable.
  // Avoid dynamic imports which can throw during SSR if the bundler can't
  // determine the exact target at runtime.
  const messages =
    locale === 'es'
      ? (await import('../locales/es.json')).default
      : (await import('../locales/en.json')).default;

  return {
    locale,
    messages,
  };
});
