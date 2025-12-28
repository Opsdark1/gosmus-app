"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    const hasSession = document.cookie.includes("__session=");
    router.replace(hasSession ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
