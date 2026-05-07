"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type CardCatalog = {
  id: string;
  name: string;
  issuer: string;
  network: string;
  image_url: string | null;
  created_at: string;
};

type AddCardModalProps = {
  cardCatalog: CardCatalog[];
  triggerClassName?: string;
};

type AddCardApiResponse = {
  error?: string;
};

export function AddCardModal({ cardCatalog, triggerClassName }: AddCardModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedCard = useMemo(
    () => cardCatalog.find((card) => card.id === selectedCardId) ?? null,
    [cardCatalog, selectedCardId],
  );

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function openModal() {
    setIsOpen(true);
    setSelectedCardId(null);
    setNickname("");
    setErrorMessage(null);
  }

  function closeModal() {
    setIsOpen(false);
    setSelectedCardId(null);
    setNickname("");
    setIsSubmitting(false);
    setErrorMessage(null);
  }

  async function handleAddToWallet() {
    if (!selectedCard) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/user-cards/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId: selectedCard.id,
          nickname: nickname.trim() || null,
        }),
      });

      const payload = (await response.json()) as AddCardApiResponse;

      if (!response.ok) {
        setErrorMessage(payload.error ?? "Could not add card right now.");
        setIsSubmitting(false);
        return;
      }

      closeModal();
      router.refresh();
    } catch {
      setErrorMessage("Something went wrong while adding your card.");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={
          triggerClassName ??
          "flex h-40 w-50 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
        }
        aria-label="Add new card"
      >
        <span className="text-4xl font-light text-indigo-500">+</span>
      </button>

      {isOpen && typeof window !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/50 p-2 sm:p-4">
              <div className="h-[90vh] w-[95vw] max-w-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:h-auto">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <h3 className="text-lg font-semibold text-slate-900">Add a Card</h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close add card modal"
                  >
                    ×
                  </button>
                </div>

                <div className="h-[calc(90vh-76px)] overflow-y-auto p-5 sm:h-auto">
                  {!selectedCard ? (
                    <>
                      <p className="text-sm text-slate-600">Choose a card to add to your wallet.</p>
                      <div className="mt-4 max-h-[60vh] overflow-y-auto">
                        {cardCatalog.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                            {cardCatalog.map((card) => (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => setSelectedCardId(card.id)}
                                className="min-h-11 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
                              >
                                <div className="h-20 overflow-hidden rounded-lg bg-slate-100">
                                  {card.image_url ? (
                                    <div
                                      className="h-full w-full bg-cover bg-center bg-no-repeat"
                                      style={{ backgroundImage: `url("${card.image_url}")` }}
                                      role="img"
                                      aria-label={card.name}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-indigo-500 to-indigo-700 px-2 text-center text-xs font-semibold text-white">
                                      {card.name}
                                    </div>
                                  )}
                                </div>
                                <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-800">{card.name}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            No cards available in catalog yet.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCardId(null);
                          setErrorMessage(null);
                        }}
                        className="mb-4 inline-flex min-h-11 items-center rounded-md px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                      >
                        ← Back
                      </button>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Selected Card</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{selectedCard.name}</p>

                        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="nickname">
                          Nickname (optional)
                        </label>
                        <input
                          id="nickname"
                          name="nickname"
                          type="text"
                          value={nickname}
                          onChange={(event) => setNickname(event.target.value)}
                          placeholder="e.g. John's Amex Platinum"
                          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 transition focus:ring-2"
                        />
                      </div>

                      {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}

                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddToWallet}
                          disabled={isSubmitting}
                          className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSubmitting ? "Adding..." : "Add to Wallet"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
