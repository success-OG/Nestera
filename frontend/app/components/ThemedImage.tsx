"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { useTheme } from "../context/ThemeContext";

interface ThemedImageProps extends Omit<ImageProps, "src"> {
  srcLight: string;
  srcDark: string;
  alt: string;
}

/**
 * A responsive image component that automatically switches between light and dark
 * source files based on the user's active theme preference.
 * 
 * @example
 * ```tsx
 * <ThemedImage 
 *   srcLight="/logo-light.png" 
 *   srcDark="/logo-dark.png" 
 *   alt="Nestera Logo" 
 *   width={180} 
 *   height={40} 
 * />
 * ```
 * 
 * @param srcLight - Path to the image for light mode.
 * @param srcDark - Path to the image for dark mode.
 * @param alt - Descriptive text for screen readers.
 */
export default function ThemedImage({ srcLight, srcDark, alt, className, ...props }: ThemedImageProps) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? srcDark : srcLight;
  const [loaded, setLoaded] = useState(false);

  return (
    <span className="relative inline-block">
      {!loaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-inherit skeleton-shimmer"
        />
      )}
      <Image
        {...props}
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}
