"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AMOUNT_SAVED_EVENT = "amount-saved-adjust";

const navLinks = [
  { label: "Home", href: "/dashboard", icon: "⌂" },
  { label: "Cards", href: "/dashboard/cards", icon: "◫" },
  { label: "Remaining", href: "/dashboard/remaining", icon: "◌" },
  { label: "Redeemed", href: "/dashboard/redeemed", icon: "✓" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DashboardBottomNav({ initialAmount = 0 }: { initialAmount?: number }) {
  const pathname = usePathname();
  const [amount, setAmount] = useState(initialAmount);

  useEffect(() => {
    setAmount(initialAmount);
  }, [initialAmount]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ delta?: number }>;
      const delta = customEvent.detail?.delta ?? 0;
      setAmount((prev) => Math.max(0, prev + delta));
    };

    window.addEventListener(AMOUNT_SAVED_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(AMOUNT_SAVED_EVENT, handler as EventListener);
    };
  }, []);

  const roundedAmount = useMemo(() => Number(amount.toFixed(2)), [amount]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Amount Saved</p>
          <p className="text-sm font-semibold text-indigo-600">{formatCurrency(roundedAmount)}</p>
        </div>
        <div className="grid grid-cols-4">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 text-xs ${
                isActive ? "text-indigo-600" : "text-slate-500"
              }`}
            >
              <span className={`text-base ${isActive ? "font-semibold" : ""}`}>{link.icon}</span>
              <span className={isActive ? "font-semibold" : ""}>{link.label}</span>
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
