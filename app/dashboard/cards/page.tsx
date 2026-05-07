import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { FlippableUserCards } from "@/components/cards/flippable-user-cards";
import { AmountSavedTracker } from "@/components/layout/amount-saved-tracker";
import { DashboardBottomNav } from "@/components/layout/dashboard-bottom-nav";
import { DashboardSidebarNav } from "@/components/layout/dashboard-sidebar-nav";
import { LogoutConfirmButton, LogoutConfirmIconButton } from "@/components/layout/logout-confirm-button";

type CardCatalog = {
  id: string;
  name: string;
  issuer: string;
  network: string;
  image_url: string | null;
  created_at: string;
};

type UserCardWithCatalog = {
  id: string;
  user_id: string;
  card_id: string;
  nickname: string | null;
  created_at: string;
  card_catalog: CardCatalog | CardCatalog[] | null;
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

export default async function DashboardCardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const [userCardsRes, cardCatalogRes] = await Promise.all([
    supabase
      .from("user_cards")
      .select("id,user_id,card_id,nickname,created_at,card_catalog(id,name,issuer,network,image_url,created_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("card_catalog").select("id,name,issuer,network,image_url,created_at").order("name", { ascending: true }),
  ]);
  const { data: redeemedUsageRows } = await supabase
    .from("user_benefit_usage")
    .select("card_benefits(value)")
    .eq("user_id", user.id)
    .eq("used", true);

  const userCards = (userCardsRes.data ?? []) as UserCardWithCatalog[];
  const cardCatalog = (cardCatalogRes.data ?? []) as CardCatalog[];
  const hasErrors = Boolean(userCardsRes.error || cardCatalogRes.error);
  const amountSaved = ((redeemedUsageRows ?? []) as Array<{ card_benefits: { value: number } | { value: number }[] | null }>).reduce(
    (total, row) => {
      const benefit = Array.isArray(row.card_benefits) ? row.card_benefits[0] : row.card_benefits;
      return total + (benefit?.value ?? 0);
    },
    0,
  );

  const avatarInitial = getInitial(user.user_metadata?.full_name as string | undefined, user.email);

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
            <h1 className="text-2xl font-semibold text-slate-900">Credit Cards</h1>
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
              We could not load all card data right now.
            </div>
          ) : null}

          <FlippableUserCards userCards={userCards} cardCatalog={cardCatalog} layout="grid" />
        </section>
      </div>
      <DashboardBottomNav initialAmount={amountSaved} />
    </main>
  );
}
