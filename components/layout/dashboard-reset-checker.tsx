"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function DashboardResetChecker() {
  const pathname = usePathname();

  useEffect(() => {
    void fetch("/api/user-benefit-usage/reset", {
      method: "POST",
    });
  }, [pathname]);

  return null;
}
