import type { Metadata } from "next";
import "./globals.css";
import { AppToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { CookieConsent } from "@/components/cookie-consent";

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || "https://gosmus.com";

export const metadata: Metadata = {
  title: "Gosmus | Gestion de stock pharmacie",
  description: "Plateforme Gosmus pour pharmacies et parapharmacies au Maroc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <AppToaster />
            <CookieConsent privacyPolicyUrl={`${LANDING_URL}/politique-confidentialite`} />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
