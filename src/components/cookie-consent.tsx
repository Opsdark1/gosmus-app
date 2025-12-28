"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hasConsentCookie, acceptCookies } from "@/lib/cookies";
import { Button } from "@/components/ui/button";
import { Cookie, Shield, X } from "lucide-react";

const EXEMPT_PATHS = [
  "/politique-confidentialite",
  "/conditions-utilisation",
  "/mentions-legales",
];

interface CookieConsentProps {
  privacyPolicyUrl?: string;
}

export function CookieConsent({ privacyPolicyUrl }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (EXEMPT_PATHS.some(path => pathname?.startsWith(path))) {
      return;
    }
    
    const hasConsent = hasConsentCookie();
    if (!hasConsent) {
      const timer = setTimeout(() => {
        setShowBanner(true);
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const handleAccept = () => {
    acceptCookies();
    setIsAnimating(false);
    setTimeout(() => {
      setShowBanner(false);
    }, 300);
  };

  const handleDecline = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setShowBanner(false);
      if (window.history.length > 1) {
        router.back();
      } else {
        window.location.href = "https://www.google.com";
      }
    }, 300);
  };

  if (!showBanner) return null;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
      
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 transition-transform duration-300 ease-out ${
          isAnimating ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
      >
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Cookie className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 id="cookie-consent-title" className="text-lg font-semibold mb-1">
                    Nous utilisons des cookies
                  </h2>
                  <p id="cookie-consent-description" className="text-sm text-muted-foreground leading-relaxed">
                    Ce site utilise des cookies essentiels pour assurer son bon fonctionnement et améliorer votre expérience. 
                    En continuant à naviguer sur ce site, vous acceptez notre utilisation des cookies.
                  </p>
                </div>
              </div>

              <div className="mb-6 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">Cookies utilisés :</span>
                </div>
                <ul className="mt-2 ml-6 text-sm text-muted-foreground list-disc space-y-1">
                  <li><strong>Cookies de session</strong> — pour maintenir votre connexion sécurisée</li>
                  <li><strong>Cookies de préférences</strong> — pour mémoriser vos paramètres (thème, langue)</li>
                </ul>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                {privacyPolicyUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
                      Politique de confidentialité
                    </a>
                  </Button>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDecline}
                    className="flex-1 sm:flex-none"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Refuser
                  </Button>
                  <Button
                    onClick={handleAccept}
                    className="flex-1 sm:flex-none"
                  >
                    <Cookie className="h-4 w-4 mr-2" />
                    Accepter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
