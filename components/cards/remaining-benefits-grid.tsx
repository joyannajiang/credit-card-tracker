"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emitAmountSavedAdjust } from "../layout/amount-saved-tracker";

type BenefitPeriod = "one-time" | "monthly" | "quarterly" | "semi-annual" | "annual";

export type RemainingBenefitTile = {
  usageId: string;
  title: string;
  description: string;
  value: number;
  period: BenefitPeriod;
  cardName: string;
  cardImageUrl: string | null;
};

type RemainingBenefitsGridProps = {
  initialTiles: RemainingBenefitTile[];
};

type ToggleResponse = {
  error?: string;
};

function formatPeriod(period: BenefitPeriod) {
  return period.replace("-", " ").toUpperCase();
}

export function RemainingBenefitsGrid({ initialTiles }: RemainingBenefitsGridProps) {
  const router = useRouter();
  const [tiles, setTiles] = useState<RemainingBenefitTile[]>(initialTiles);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const handleMarkUsed = async (usageId: string) => {
    if (pendingIds.has(usageId)) {
      return;
    }

    const removedIndex = tiles.findIndex((tile) => tile.usageId === usageId);
    if (removedIndex === -1) {
      return;
    }
    const removedTile: RemainingBenefitTile = tiles[removedIndex];

    setTiles((prev) => prev.filter((tile) => tile.usageId !== usageId));
    emitAmountSavedAdjust(removedTile.value);

    setPendingIds((prev) => new Set(prev).add(usageId));

    try {
      const response = await fetch("/api/user-benefit-usage/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usageId,
          used: true,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as ToggleResponse;
        console.error(payload.error ?? "Unable to mark benefit as used.");
        if (removedIndex >= 0) {
          setTiles((prev) => {
            const next = [...prev];
            next.splice(Math.min(removedIndex, next.length), 0, removedTile);
            return next;
          });
          emitAmountSavedAdjust(-removedTile.value);
        }
      }
    } catch {
      if (removedIndex >= 0) {
        setTiles((prev) => {
          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, removedTile);
          return next;
        });
        emitAmountSavedAdjust(-removedTile.value);
      }
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(usageId);
        return next;
      });
      router.refresh();
    }
  };

  if (tiles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
        <p className="text-base font-medium text-slate-700">All caught up.</p>
        <p className="mt-2 text-sm text-slate-500">No remaining benefits right now. Redeemed benefits will move out of this list.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {tiles.map((tile) => (
        <button
          key={tile.usageId}
          type="button"
          onClick={() => handleMarkUsed(tile.usageId)}
          disabled={pendingIds.has(tile.usageId)}
          className={`flex h-40 w-full flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 ${
            pendingIds.has(tile.usageId) ? "cursor-wait opacity-70" : "cursor-pointer"
          }`}
          aria-label={`Mark as used: ${tile.title}`}
        >
          <div className="min-h-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wide text-slate-400">{formatPeriod(tile.period)}</p>
            <p className="mt-2 line-clamp-2 text-base font-semibold leading-tight text-slate-900">{tile.title}</p>
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{tile.description}</p>
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
      ))}
    </div>
  );
}
