"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { shouldReset } from "@/lib/utils";

type UsageRow = {
  id: string;
  used_at: string | null;
  card_benefits: { period: string } | { period: string }[] | null;
};

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    const runResetCheck = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from("user_benefit_usage")
        .select("id,used_at,card_benefits(period)")
        .eq("user_id", user.id)
        .eq("used", true);

      if (error) {
        console.error("Failed to fetch redeemed benefits for reset check", error);
        return;
      }

      const rows = (data ?? []) as UsageRow[];
      const idsToReset: string[] = [];

      for (const row of rows) {
        const benefit = normalizeRelation(row.card_benefits);
        if (!benefit || !row.used_at) {
          continue;
        }

        if (shouldReset(benefit.period, row.used_at)) {
          idsToReset.push(row.id);
        }
      }

      if (idsToReset.length === 0) {
        return;
      }

      const { error: updateError } = await supabase
        .from("user_benefit_usage")
        .update({ used: false, used_at: null })
        .in("id", idsToReset)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Failed to update reset benefits", updateError);
        return;
      }

      router.refresh();
    };

    void runResetCheck();
  }, [router]);

  return <>{children}</>;
}
