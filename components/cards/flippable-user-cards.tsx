"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AddCardModal } from "./add-card-modal";
import { ImageWithFallback } from "../ui/image-with-fallback";

type CardCatalog = {
  id: string;
  name: string;
  issuer: string;
  network: string;
  image_url: string | null;
  created_at: string;
};

export type UserCardWithCatalog = {
  id: string;
  user_id: string;
  card_id: string;
  nickname: string | null;
  created_at: string;
  card_catalog: CardCatalog | CardCatalog[] | null;
};

type FlippableUserCardsProps = {
  userCards: UserCardWithCatalog[];
  cardCatalog: CardCatalog[];
  layout: "carousel" | "grid";
};

type RemoveResponse = {
  error?: string;
};

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function FlippableUserCards({ userCards, cardCatalog, layout }: FlippableUserCardsProps) {
  const router = useRouter();
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [confirmCardId, setConfirmCardId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const cardToRemove = userCards.find((card) => card.id === confirmCardId) ?? null;
  const removeLabel = cardToRemove?.nickname || normalizeRelation(cardToRemove?.card_catalog)?.name || "this card";

  const handleRemoveCard = async () => {
    if (!confirmCardId) {
      return;
    }

    setIsRemoving(true);

    try {
      const response = await fetch("/api/user-cards/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCardId: confirmCardId }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as RemoveResponse;
        console.error(payload.error ?? "Unable to remove card.");
        setIsRemoving(false);
        return;
      }

      setConfirmCardId(null);
      setFlippedCardId(null);
      router.refresh();
    } catch {
      setIsRemoving(false);
    }
  };

  const containerClass =
    layout === "grid"
      ? "grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4"
      : "flex min-w-full touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto pb-2";

  const tileWrapperClass = layout === "grid" ? "h-44 w-full perspective-distant md:h-52" : "h-40 w-[68vw] max-w-52 shrink-0 snap-start perspective-distant sm:w-50";

  const frontArticleClass =
    layout === "grid"
      ? "absolute inset-0 flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm backface-hidden"
      : "absolute inset-0 flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm backface-hidden";

  const addTileClass =
    layout === "grid"
      ? "flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 md:h-52"
      : "flex h-40 w-[68vw] max-w-52 shrink-0 snap-start items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 sm:w-50";

  return (
    <>
      <div className={containerClass}>
        {userCards.map((card) => {
          const catalog = normalizeRelation(card.card_catalog);
          const cardName = catalog?.name ?? "Unnamed Card";
          const displayName = card.nickname || cardName;
          const isFlipped = flippedCardId === card.id;

          return (
            <div key={card.id} className={tileWrapperClass}>
              <div
                className={`relative h-full w-full rounded-xl transform-3d transition-transform duration-300 ${
                  isFlipped ? "transform-[rotateY(180deg)]" : ""
                }`}
              >
                <article className={frontArticleClass}>
                  <button
                    type="button"
                    onClick={() => setFlippedCardId(card.id)}
                    className="flex h-full min-h-11 flex-col text-left"
                    aria-label={`Manage ${displayName}`}
                  >
                    <div className={layout === "grid" ? "h-24 overflow-hidden rounded-lg bg-slate-100 md:h-32" : "h-24 overflow-hidden rounded-lg bg-slate-100"}>
                      {catalog?.image_url ? (
                        <ImageWithFallback
                          src={catalog.image_url}
                          alt={cardName}
                          className="h-full w-full object-cover"
                          fallbackClassName="h-full w-full bg-slate-200"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-200" />
                      )}
                    </div>

                    <p className={layout === "grid" ? "mt-3 line-clamp-1 text-sm font-semibold text-slate-900" : "mt-2 line-clamp-2 text-center text-xs font-medium text-slate-700"}>
                      {cardName}
                    </p>

                    {card.nickname ? (
                      <p className={layout === "grid" ? "line-clamp-1 text-xs text-slate-500" : "line-clamp-1 text-center text-[11px] text-slate-500"}>
                        {card.nickname}
                      </p>
                    ) : null}
                  </button>
                </article>

                <article className="absolute inset-0 flex h-full w-full transform-[rotateY(180deg)] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm backface-hidden">
                  <p className="mb-4 line-clamp-2 text-center text-sm font-semibold text-slate-900">{displayName}</p>
                  <button
                    type="button"
                    onClick={() => setConfirmCardId(card.id)}
                    className="min-h-11 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    Remove Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlippedCardId(null)}
                    className="mt-3 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </article>
              </div>
            </div>
          );
        })}

        <AddCardModal cardCatalog={cardCatalog} triggerClassName={addTileClass} />
      </div>

      {confirmCardId ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Remove Card</h3>
            <p className="mt-3 text-sm text-slate-600">
              Are you sure you want to remove {removeLabel}? This will permanently delete all of its benefits from your
              wallet.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmCardId(null);
                  setFlippedCardId(null);
                  setIsRemoving(false);
                }}
                disabled={isRemoving}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveCard}
                disabled={isRemoving}
                className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRemoving ? "Removing..." : "Remove Card"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
