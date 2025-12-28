const COOKIE_DOMAIN = process.env.NODE_ENV === "production" ? ".gosmus.com" : undefined;
const COOKIE_PATH = "/";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export const COOKIE_NAMES = {
  THEME: "gosmus-theme",
  CONSENT: "gosmus-consent",
} as const;

export const CONSENT_VALUES = {
  ACCEPTED: "accepted",
} as const;

export function setCookie(name: string, value: string, maxAge: number = COOKIE_MAX_AGE): void {
  if (typeof document === "undefined") return;
  
  let cookieString = `${name}=${encodeURIComponent(value)}; path=${COOKIE_PATH}; max-age=${maxAge}; SameSite=Lax`;
  
  if (COOKIE_DOMAIN) {
    cookieString += `; domain=${COOKIE_DOMAIN}`;
  }
  
  if (process.env.NODE_ENV === "production") {
    cookieString += "; Secure";
  }
  
  document.cookie = cookieString;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split("=");
    if (cookieName === name) {
      return decodeURIComponent(cookieValue || "");
    }
  }
  return null;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  
  let cookieString = `${name}=; path=${COOKIE_PATH}; max-age=0`;
  
  if (COOKIE_DOMAIN) {
    cookieString += `; domain=${COOKIE_DOMAIN}`;
  }
  
  document.cookie = cookieString;
}

export function hasConsentCookie(): boolean {
  return getCookie(COOKIE_NAMES.CONSENT) === CONSENT_VALUES.ACCEPTED;
}

export function acceptCookies(): void {
  setCookie(COOKIE_NAMES.CONSENT, CONSENT_VALUES.ACCEPTED);
}

export function getThemeCookie(): string | null {
  return getCookie(COOKIE_NAMES.THEME);
}

export function setThemeCookie(theme: string): void {
  setCookie(COOKIE_NAMES.THEME, theme);
}
