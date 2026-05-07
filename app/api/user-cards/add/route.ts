import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type AddCardRequest = {
  cardId?: string;
  nickname?: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AddCardRequest;
  try {
    body = (await request.json()) as AddCardRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const cardId = body.cardId?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "Card is required" }, { status: 400 });
  }

  const nickname = body.nickname?.trim() ? body.nickname.trim() : null;

  const { data: cardExists, error: cardLookupError } = await supabase
    .from("card_catalog")
    .select("id")
    .eq("id", cardId)
    .maybeSingle();

  if (cardLookupError) {
    return NextResponse.json({ error: "Unable to verify selected card" }, { status: 500 });
  }

  if (!cardExists) {
    return NextResponse.json({ error: "Selected card was not found" }, { status: 404 });
  }

  const { data: userCard, error: userCardInsertError } = await supabase
    .from("user_cards")
    .insert({
      user_id: user.id,
      card_id: cardId,
      nickname,
    })
    .select("id")
    .single();

  if (userCardInsertError || !userCard) {
    return NextResponse.json({ error: "Could not add card to wallet" }, { status: 500 });
  }

  const { data: benefits, error: benefitsError } = await supabase.from("card_benefits").select("id").eq("card_id", cardId);

  if (benefitsError) {
    await supabase.from("user_cards").delete().eq("id", userCard.id);
    return NextResponse.json({ error: "Could not load benefits for selected card" }, { status: 500 });
  }

  if (benefits && benefits.length > 0) {
    const usageRows = benefits.map((benefit) => ({
      user_card_id: userCard.id,
      benefit_id: benefit.id,
      user_id: user.id,
      used: false,
    }));

    const { error: usageInsertError } = await supabase.from("user_benefit_usage").insert(usageRows);

    if (usageInsertError) {
      await supabase.from("user_cards").delete().eq("id", userCard.id);
      return NextResponse.json({ error: "Could not initialize benefit usage" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
