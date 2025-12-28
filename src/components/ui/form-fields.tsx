"use client";

import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Wrapper de champ de formulaire avec label, erreur et indice
 */
export function FormField({ 
  label, 
  required, 
  error, 
  hint, 
  className, 
  children 
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className={cn(error && "text-destructive")}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * Grille de formulaire responsive
 */
export function FormGrid({ 
  children, 
  columns = 2,
  className 
}: { 
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

/**
 * Input texte standardisé
 */
interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number" | "password";
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: string;
  className?: string;
}

export function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  disabled,
  error,
  hint,
  min,
  max,
  step,
  className,
}: TextInputProps) {
  return (
    <FormField label={label} required={required} error={error} hint={hint} className={className}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={cn(error && "border-destructive")}
      />
    </FormField>
  );
}

/**
 * Textarea standardisée
 */
interface TextAreaInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export function TextAreaInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required,
  disabled,
  error,
  hint,
  className,
}: TextAreaInputProps) {
  return (
    <FormField label={label} required={required} error={error} hint={hint} className={className}>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(error && "border-destructive")}
      />
    </FormField>
  );
}

/**
 * Select standardisé
 */
interface SelectInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export function SelectInput({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Sélectionner...",
  required,
  disabled,
  error,
  hint,
  className,
}: SelectInputProps) {
  return (
    <FormField label={label} required={required} error={error} hint={hint} className={className}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className={cn(error && "border-destructive")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

/**
 * Section de formulaire avec titre optionnel
 */
export function FormSection({ 
  title, 
  children,
  className 
}: { 
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}
