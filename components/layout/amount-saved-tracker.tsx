"use client";

import { useEffect, useMemo, useState } from "react";

const AMOUNT_SAVED_EVENT = "amount-saved-adjust";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function emitAmountSavedAdjust(delta: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AMOUNT_SAVED_EVENT, {
      detail: { delta },
    }),
  );
}

function AmountSavedCard({ amount }: { amount: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount Saved</p>
      <p className="mt-1 text-xl font-semibold text-indigo-600">{formatCurrency(amount)}</p>
    </div>
  );
}

export function AmountSavedTracker({ initialAmount }: { initialAmount: number }) {
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
    <div className="hidden md:block">
      <AmountSavedCard amount={roundedAmount} />
    </div>
  );
}
