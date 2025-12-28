"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return <Toaster richColors position="bottom-right" expand visibleToasts={4} />;
}
