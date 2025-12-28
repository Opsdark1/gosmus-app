"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRIES = [
  { code: "+212", name: "Maroc", flag: "🇲🇦" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+34", name: "Espagne", flag: "🇪🇸" },
  { code: "+213", name: "Algérie", flag: "🇩🇿" },
  { code: "+216", name: "Tunisie", flag: "🇹🇳" },
];

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    const [countryCode, setCountryCode] = React.useState("+212");
    const [phoneNumber, setPhoneNumber] = React.useState("");

    React.useEffect(() => {
      if (value) {
        const country = COUNTRIES.find((c) => value.startsWith(c.code));
        if (country) {
          setCountryCode(country.code);
          setPhoneNumber(value.slice(country.code.length));
        }
      }
    }, [value]);

    const handleCountryChange = (code: string) => {
      setCountryCode(code);
      onChange?.(code + phoneNumber);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = e.target.value.replace(/\D/g, "");
      setPhoneNumber(num);
      onChange?.(countryCode + num);
    };

    const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

    return (
      <div className="flex gap-2">
        <Select value={countryCode} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue>
              <span className="flex items-center gap-1">
                <span>{selectedCountry.flag}</span>
                <span className="text-xs">{countryCode}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <span className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span className="text-sm">{country.name}</span>
                  <span className="text-xs text-muted-foreground">{country.code}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={ref}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          className={cn("flex-1", className)}
          placeholder="600 00 00 00"
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
