import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { shouldReset } from "@/lib/utils";

type BenefitUsageRow = {
  id: string;
  benefit_id: string;
  used_at: string | null;
};

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_benefit_usage")
    .select("id,benefit_id,used_at")
    .eq("user_id", user.id)
    .eq("used", true);

  if (error) {
    return NextResponse.json({ error: "Could not fetch used benefits." }, { status: 500 });
  }

  const rows = (data ?? []) as BenefitUsageRow[];
  if (rows.length === 0) {
    return NextResponse.json({ success: true, resetCount: 0 });
  }

  const benefitIds = Array.from(new Set(rows.map((row) => row.benefit_id)));
  const { data: benefits, error: benefitsError } = await supabase.from("card_benefits").select("id,period").in("id", benefitIds);

  if (benefitsError) {
    return NextResponse.json({ error: "Could not fetch benefit periods." }, { status: 500 });
  }

  const benefitPeriodById = new Map<string, string>((benefits ?? []).map((benefit) => [benefit.id as string, benefit.period as string]));

  const resetIds = rows
    .filter((row) => {
      const period = benefitPeriodById.get(row.benefit_id);
      if (!period || !row.used_at) {
        return false;
      }

      return shouldReset(period, row.used_at);
    })
    .map((row) => row.id);

  if (resetIds.length === 0) {
    return NextResponse.json({ success: true, resetCount: 0 });
  }

  const { error: updateError } = await supabase
    .from("user_benefit_usage")
    .update({
      used: false,
      used_at: null,
    })
    .in("id", resetIds)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Could not reset benefits." }, { status: 500 });
  }

  return NextResponse.json({ success: true, resetCount: resetIds.length });
}
