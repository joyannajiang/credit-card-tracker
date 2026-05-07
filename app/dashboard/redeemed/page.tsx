import { redirect } from "next/navigation";

import { DashboardBottomNav } from "@/components/layout/dashboard-bottom-nav";
import { DashboardSidebarNav } from "@/components/layout/dashboard-sidebar-nav";
import { AmountSavedTracker } from "@/components/layout/amount-saved-tracker";
import { LogoutConfirmButton, LogoutConfirmIconButton } from "@/components/layout/logout-confirm-button";
import { RedeemedBenefitsGrid, type RedeemedBenefitTile } from "@/components/cards/redeemed-benefits-grid";
import { createClient } from "@/lib/supabase/server";

type CardCatalog = {
  id: string;
  name: string;
  issuer: string;
  network: string;
  image_url: string | null;
  created_at: string;
};

type CardBenefit = {
  id: string;
  card_id: string;
  benefit_name: string;
  description: string;
  value: number;
  period: "one-time" | "monthly" | "quarterly" | "semi-annual" | "annual";
  category: "travel" | "dining" | "entertainment" | "shopping" | "wellness" | "membership" | "other";
  created_at: string;
};

type UserCard = {
  id: string;
  user_id: string;
  card_id: string;
  nickname: string | null;
  created_at: string;
  card_catalog: CardCatalog | CardCatalog[] | null;
};

type UserBenefitUsage = {
  id: string;
  user_card_id: string;
  benefit_id: string;
  user_id: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
  card_benefits: CardBenefit | CardBenefit[] | null;
};

function getInitial(fullName?: string, email?: string) {
  if (fullName?.trim()) {
    return fullName.trim().charAt(0).toUpperCase();
  }

  if (email?.trim()) {
    return email.trim().charAt(0).toUpperCase();
  }

  return "U";
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function RedeemedBenefitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const [userCardsRes, redeemedUsageRes] = await Promise.all([
    supabase
      .from("user_cards")
      .select("id,user_id,card_id,nickname,created_at,card_catalog(id,name,issuer,network,image_url,created_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_benefit_usage")
      .select(
        "id,user_card_id,benefit_id,user_id,used,used_at,created_at,card_benefits(id,card_id,benefit_name,description,value,period,category,created_at)",
      )
      .eq("user_id", user.id)
      .eq("used", true)
      .order("created_at", { ascending: false }),
  ]);

  const hasErrors = Boolean(userCardsRes.error || redeemedUsageRes.error);
  const avatarInitial = getInitial(user.user_metadata?.full_name as string | undefined, user.email);

  const userCards = (userCardsRes.data ?? []) as UserCard[];
  const userCardsById = new Map<string, UserCard>(userCards.map((card) => [card.id, card]));

  const redeemedTiles: RedeemedBenefitTile[] = ((redeemedUsageRes.data ?? []) as UserBenefitUsage[])
    .map((usage) => {
      const benefit = normalizeRelation(usage.card_benefits);
      if (!benefit) {
        return null;
      }

      const userCard = userCardsById.get(usage.user_card_id);
      const cardCatalog = normalizeRelation(userCard?.card_catalog);

      return {
        usageId: usage.id,
        title: benefit.benefit_name,
        description: benefit.description,
        value: benefit.value,
        period: benefit.period,
        usedAt: usage.used_at,
        cardName: userCard?.nickname || cardCatalog?.name || "Credit Card",
        cardImageUrl: cardCatalog?.image_url ?? null,
      };
    })
    .filter((tile): tile is RedeemedBenefitTile => tile !== null);
  const amountSaved = redeemedTiles.reduce((total, tile) => total + tile.value, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-3 pb-28 md:p-6 md:pb-6">
      <div className="mx-auto flex w-full max-w-[1200px] gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm md:gap-6 md:p-4">
        <aside className="hidden w-56 shrink-0 rounded-xl border border-slate-200 bg-white p-4 md:flex md:flex-col">
          <DashboardSidebarNav />
          <div className="mt-auto space-y-3">
            <AmountSavedTracker initialAmount={amountSaved} />
            <LogoutConfirmButton />
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Redeemed Benefits</h1>
            <div className="ml-auto flex items-center gap-2">
              <div className="md:hidden">
                <LogoutConfirmIconButton />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {avatarInitial}
              </div>
            </div>
          </div>

          {hasErrors ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              We could not load all redeemed benefits right now.
            </div>
          ) : null}

          <RedeemedBenefitsGrid initialTiles={redeemedTiles} />
        </section>
      </div>
      <DashboardBottomNav initialAmount={amountSaved} />
    </main>
  );
}
