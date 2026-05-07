"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emitAmountSavedAdjust } from "../layout/amount-saved-tracker";

type BenefitPeriod = "one-time" | "monthly" | "quarterly" | "semi-annual" | "annual";

export type RedeemedBenefitTile = {
  usageId: string;
  title: string;
  description: string;
  value: number;
  period: BenefitPeriod;
  usedAt: string | null;
  cardName: string;
  cardImageUrl: string | null;
};

type RedeemedBenefitsGridProps = {
  initialTiles: RedeemedBenefitTile[];
};

type ToggleResponse = {
  error?: string;
};

function formatPeriod(period: BenefitPeriod) {
  return period.replace("-", " ").toUpperCase();
}

function formatRedeemedDate(usedAt: string | null) {
  if (!usedAt) {
    return "Redeemed recently";
  }

  const date = new Date(usedAt);
  return `Redeemed ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function RedeemedBenefitsGrid({ initialTiles }: RedeemedBenefitsGridProps) {
  const router = useRouter();
  const [tiles, setTiles] = useState<RedeemedBenefitTile[]>(initialTiles);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const handleMarkRemaining = async (usageId: string) => {
    if (pendingIds.has(usageId)) {
      return;
    }

    const removedIndex = tiles.findIndex((tile) => tile.usageId === usageId);
    if (removedIndex === -1) {
      return;
    }
    const removedTile: RedeemedBenefitTile = tiles[removedIndex];

    setTiles((prev) => prev.filter((tile) => tile.usageId !== usageId));
    emitAmountSavedAdjust(-removedTile.value);

    setPendingIds((prev) => new Set(prev).add(usageId));

    try {
      const response = await fetch("/api/user-benefit-usage/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usageId,
          used: false,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as ToggleResponse;
        console.error(payload.error ?? "Unable to mark benefit as remaining.");
        if (removedIndex >= 0) {
          setTiles((prev) => {
            const next = [...prev];
            next.splice(Math.min(removedIndex, next.length), 0, removedTile);
            return next;
          });
          emitAmountSavedAdjust(removedTile.value);
        }
      }
    } catch {
      if (removedIndex >= 0) {
        setTiles((prev) => {
          const next = [...prev];
          next.splice(Math.min(removedIndex, next.length), 0, removedTile);
          return next;
        });
        emitAmountSavedAdjust(removedTile.value);
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
        <p className="text-base font-medium text-slate-700">Nothing redeemed yet.</p>
        <p className="mt-2 text-sm text-slate-500">Used benefits will appear here after you mark them as redeemed.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {tiles.map((tile) => (
        <button
          key={tile.usageId}
          type="button"
          onClick={() => handleMarkRemaining(tile.usageId)}
          disabled={pendingIds.has(tile.usageId)}
          className={`relative flex h-44 w-full flex-col justify-between overflow-hidden rounded-xl border border-slate-300 bg-slate-50/80 p-3 text-left shadow-sm transition ${
            pendingIds.has(tile.usageId) ? "cursor-wait opacity-70" : "cursor-pointer hover:border-indigo-300"
          }`}
          aria-label={`Move back to remaining: ${tile.title}`}
        >
          <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-700">
            ✓
          </span>

          <div className="min-h-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wide text-slate-400">{formatPeriod(tile.period)}</p>
            <p className="mt-2 line-clamp-2 text-base font-semibold leading-tight text-slate-900">{tile.title}</p>
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{tile.description}</p>
            <p className="mt-2 line-clamp-1 text-xs text-slate-400">{formatRedeemedDate(tile.usedAt)}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 pt-2">
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
