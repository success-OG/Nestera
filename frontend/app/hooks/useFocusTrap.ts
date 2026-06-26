import { useEffect, useRef, RefObject } from "react";

interface UseFocusTrapOptions {
  isOpen?: boolean;
  containerRef?: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(options?: UseFocusTrapOptions) {
  const internalRef = useRef<T>(null);
  const containerRef = options?.containerRef || internalRef;
  const isOpen = options?.isOpen ?? true;

  useEffect(() => {
    if (!isOpen) return;
    
    const element = containerRef.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (options?.initialFocusRef?.current) {
      options.initialFocusRef.current.focus();
    } else {
      firstElement?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && options?.onEscape) {
        options.onEscape();
        return;
      }
      
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, containerRef, options?.initialFocusRef, options?.onEscape]);

  return internalRef;
}
