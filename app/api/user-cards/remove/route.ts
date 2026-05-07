import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RemoveCardRequest = {
  userCardId?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RemoveCardRequest;
  try {
    body = (await request.json()) as RemoveCardRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const userCardId = body.userCardId?.trim();
  if (!userCardId) {
    return NextResponse.json({ error: "userCardId is required" }, { status: 400 });
  }

  const { error } = await supabase.from("user_cards").delete().eq("id", userCardId).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Unable to remove card" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
