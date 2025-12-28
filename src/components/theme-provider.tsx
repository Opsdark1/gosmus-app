"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PropsWithChildren, useEffect } from "react";
import { COOKIE_NAMES, setCookie, getCookie } from "@/lib/cookies";

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={COOKIE_NAMES.THEME}
      disableTransitionOnChange={false}
    >
      <ThemeSyncWrapper>{children}</ThemeSyncWrapper>
    </NextThemesProvider>
  );
}

function ThemeSyncWrapper({ children }: PropsWithChildren) {
  useEffect(() => {
    const handleStorageChange = () => {
      const theme = localStorage.getItem(COOKIE_NAMES.THEME);
      if (theme) {
        setCookie(COOKIE_NAMES.THEME, theme);
      }
    };

    const savedTheme = getCookie(COOKIE_NAMES.THEME);
    if (savedTheme) {
      localStorage.setItem(COOKIE_NAMES.THEME, savedTheme);
    } else {
      const localTheme = localStorage.getItem(COOKIE_NAMES.THEME);
      if (localTheme) {
        setCookie(COOKIE_NAMES.THEME, localTheme);
      }
    }

    window.addEventListener("storage", handleStorageChange);
    
    const observer = new MutationObserver(() => {
      const theme = localStorage.getItem(COOKIE_NAMES.THEME);
      if (theme) {
        setCookie(COOKIE_NAMES.THEME, theme);
      }
    });

    const interval = setInterval(() => {
      const theme = localStorage.getItem(COOKIE_NAMES.THEME);
      const cookieTheme = getCookie(COOKIE_NAMES.THEME);
      if (theme && theme !== cookieTheme) {
        setCookie(COOKIE_NAMES.THEME, theme);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
