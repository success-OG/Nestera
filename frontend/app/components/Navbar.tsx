"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe2, Menu, Wallet, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

interface NavLink {
  label: string;
  href: string;
}

/**
 * Main navigation bar component.
 * Handles responsive layout, language switching, and active link states.
 * 
 * @example
 * ```tsx
 * <Navbar />
 * ```
 */
const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const t = useTranslations("Navbar");
  const locale = useLocale();

  const navLinks: NavLink[] = [
    { label: t("features"), href: "/features" },
    { label: t("savings"), href: "/savings" },
    { label: t("dashboard"), href: "/dashboard" },
    { label: t("community"), href: "/community" },
    { label: t("docs"), href: "/docs" },
  ];

  const isActiveLink = (href: string): boolean => {
    // Remove locale prefix for comparison
    const cleanPathname = pathname.replace(/^\/[a-z]{2}/, "");
    const cleanHref = href.replace(/^\/[a-z]{2}/, "");
    return cleanPathname === cleanHref || cleanPathname?.startsWith(cleanHref + "/");
  };

  const navLinkBase =
    "text-sm font-medium no-underline text-slate-300 transition-all duration-200 border-b-2 border-transparent pb-0.5 hover:text-white";
  const navLinkActive =
    "text-cyan-500 border-cyan-500 border-b-cyan-500";

  const mobileLinkBase =
    "block py-3 px-3 rounded-md text-base font-medium no-underline text-slate-300 transition-all duration-200 border-l-4 border-transparent hover:text-white hover:bg-slate-800";
  const mobileLinkActive =
    "text-cyan-500 bg-slate-800 border-l-cyan-500";

  const handleLanguageChange = (locale: string) => {
    const currentPath = pathname.replace(/^\/[a-z]{2}/, "") || "/";
    setIsLanguageMenuOpen(false);
    router.push(`/${locale}${currentPath}`);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#061a1a]">
      <div className="w-full">
        <div className="flex justify-between items-center h-16 px-[30px]">
          <div className="shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 no-underline transition-all duration-200 ease-in-out hover:scale-105"
            >
              <div className="w-7 h-7 rounded-full bg-[#00c9c8] flex items-center justify-center text-[#061a1a] font-bold text-lg shrink-0 p-0">
                <Wallet size={18} color="#061a1a" strokeWidth={2} />
              </div>
              <span className="text-xl font-bold text-white max-sm:hidden">
                Nestera
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActiveLink(link.href)
                    ? `${navLinkBase} ${navLinkActive}`
                    : navLinkBase
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="hidden sm:inline-flex items-center justify-center py-3 px-6 rounded-full bg-[#00c9c8] text-[#061a1a] font-semibold text-sm border-none cursor-pointer shadow-[0_10px_15px_-3px_rgba(0,212,192,0.1)] transition-all duration-200 hover:shadow-[0_10px_15px_-3px_rgba(0,212,192,0.5)] hover:scale-105"
            >
              {t("connectWallet")}
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
              type="button"
              onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white hover:text-cyan-300 focus:outline-none"
              aria-label={t("language")}
              aria-haspopup="true"
              aria-expanded={isLanguageMenuOpen}
            >
                <Globe2 size={16} className="mr-2" aria-hidden="true" />
                <span className="font-semibold">
                  {locale === "en" ? t("english") : t("spanish")}
                </span>
                <svg className="ml-2 w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 1 0 111.414 0L10 10.586l3.293-3.293a1 1 1 0 111.414 1.414l-4 4a1 1 1 0 01-1.414 0l-4-4a1 1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Language dropdown menu */}
              <div className={`${isLanguageMenuOpen ? "block" : "hidden"} absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                <div className="py-1">
                  <button
                    type="button"
                    className="block px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleLanguageChange("en");
                    }}
                  >
                    {t("english")}
                  </button>
                  <button
                    type="button"
                    className="block px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleLanguageChange("es");
                    }}
                  >
                    {t("spanish")}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex md:hidden items-center justify-center p-2 rounded-md text-slate-400 bg-transparent border-none cursor-pointer transition-all duration-200 hover:text-white hover:bg-slate-800"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">{t("openMenu")}</span>
              {isMobileMenuOpen ? (
                <X size={24} aria-hidden="true" />
              ) : (
                <Menu size={24} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`bg-[#061a1a] border-t border-slate-600 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] ${isMobileMenuOpen ? "block" : "hidden"}`}
      >
        <div className="p-2 pb-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isActiveLink(link.href)
                  ? `${mobileLinkBase} ${mobileLinkActive}`
                  : mobileLinkBase
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
            <button
              type="button"
              className="w-full mt-4 py-3 px-6 rounded-full bg-[#00c9c8] text-[#061a1a] font-semibold text-sm border-none cursor-pointer shadow-[0_10px_15px_-3px_rgba(0,212,192,0.1)] transition-all duration-200 hover:shadow-[0_10px_15px_-3px_rgba(0,212,192,0.5)]"
            >
              {t("connectWallet")}
            </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
