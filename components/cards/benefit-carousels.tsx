"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { emitAmountSavedAdjust } from "../layout/amount-saved-tracker";

type BenefitPeriod = "one-time" | "monthly" | "quarterly" | "semi-annual" | "annual";

export type DashboardBenefitTile = {
  usageId: string;
  title: string;
  description: string;
  value: number;
  period: BenefitPeriod;
  cardName: string;
  cardImageUrl: string | null;
  used: boolean;
};

type BenefitCarouselsProps = {
  initialTiles: DashboardBenefitTile[];
};

type ToggleResponse = {
  error?: string;
};

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPeriod(period: BenefitPeriod) {
  return period.replace("-", " ").toUpperCase();
}

function BenefitTile({
  tile,
  isPending,
  onToggle,
}: {
  tile: DashboardBenefitTile;
  isPending: boolean;
  onToggle: (usageId: string, nextUsed: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tile.usageId, !tile.used)}
      disabled={isPending}
      className={`relative flex h-40 w-[68vw] max-w-52 shrink-0 snap-start flex-col justify-between overflow-hidden rounded-xl border p-3 text-left shadow-sm transition sm:w-50 ${
        tile.used ? "border-slate-300 bg-slate-50/80" : "border-slate-200 bg-white hover:border-indigo-300"
      } ${isPending ? "cursor-wait" : "cursor-pointer"}`}
      aria-label={`${tile.used ? "Mark as remaining" : "Mark as redeemed"}: ${tile.title}`}
    >
      {tile.used ? (
        <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-700">
          ✓
        </span>
      ) : null}

      <div className="min-h-0 flex-1">
        <p className="text-[10px] font-semibold tracking-wide text-slate-400">{formatPeriod(tile.period)}</p>
        <div className="mt-2 min-h-0">
          <p className="line-clamp-2 text-base font-semibold leading-tight text-slate-900">
            <span className="text-slate-600">{formatUsd(tile.value)}</span>
            <span> {tile.title}</span>
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{tile.description}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 pt-2">
        <div className="h-5 w-5 shrink-0 overflow-hidden rounded-sm border border-slate-200 bg-slate-100">
          {tile.cardImageUrl ? (
            <div
              className="h-full w-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${tile.cardImageUrl}")` }}
              role="img"
              aria-label={tile.cardName}
            />
          ) : null}
        </div>
        <p className="min-w-0 truncate text-xs text-slate-400">{tile.cardName}</p>
      </div>
    </button>
  );
}

function CarouselSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-8">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex min-w-full touch-pan-x snap-x snap-mandatory gap-3">{children}</div>
      </div>
    </section>
  );
}

export function BenefitCarousels({ initialTiles }: BenefitCarouselsProps) {
  const router = useRouter();
  const [tiles, setTiles] = useState<DashboardBenefitTile[]>(initialTiles);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTiles(initialTiles);
    setPendingIds(new Set());
  }, [initialTiles]);

  const remainingBenefits = useMemo(() => tiles.filter((tile) => !tile.used), [tiles]);
  const redeemedBenefits = useMemo(() => tiles.filter((tile) => tile.used), [tiles]);

  const handleToggleUsage = async (usageId: string, nextUsed: boolean) => {
    if (pendingIds.has(usageId)) {
      return;
    }

    let previousTiles: DashboardBenefitTile[] = [];
    let changedValue = 0;
    setTiles((prev) => {
      previousTiles = prev;
      return prev.map((tile) => {
        if (tile.usageId !== usageId) {
          return tile;
        }
        changedValue = tile.value;
        return { ...tile, used: nextUsed };
      });
    });
    emitAmountSavedAdjust(nextUsed ? changedValue : -changedValue);

    setPendingIds((prev) => new Set(prev).add(usageId));

    try {
      const response = await fetch("/api/user-benefit-usage/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usageId, used: nextUsed }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as ToggleResponse;
        console.error(payload.error ?? "Failed to toggle benefit usage.");
        setTiles(previousTiles);
        emitAmountSavedAdjust(nextUsed ? -changedValue : changedValue);
      }
    } catch {
      setTiles(previousTiles);
      emitAmountSavedAdjust(nextUsed ? -changedValue : changedValue);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(usageId);
        return next;
      });
      router.refresh();
    }
  };

  return (
    <>
      <CarouselSection id="remaining-benefits" title="Remaining Benefits">
        {remainingBenefits.length > 0 ? (
          remainingBenefits.map((tile) => (
            <BenefitTile
              key={tile.usageId}
              tile={tile}
              isPending={pendingIds.has(tile.usageId)}
              onToggle={handleToggleUsage}
            />
          ))
        ) : (
          <div className="flex h-40 w-full min-w-80 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm text-slate-500">
            No remaining benefits yet.
          </div>
        )}
      </CarouselSection>

      <CarouselSection id="redeemed-benefits" title="Redeemed Benefits">
        {redeemedBenefits.length > 0 ? (
          redeemedBenefits.map((tile) => (
            <BenefitTile
              key={tile.usageId}
              tile={tile}
              isPending={pendingIds.has(tile.usageId)}
              onToggle={handleToggleUsage}
            />
          ))
        ) : (
          <div className="flex h-40 w-full min-w-80 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm text-slate-500">
            No redeemed benefits yet.
          </div>
        )}
      </CarouselSection>
    </>
  );
}
