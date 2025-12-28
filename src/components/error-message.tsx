'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message: string | null;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20',
      className
    )}>
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}
