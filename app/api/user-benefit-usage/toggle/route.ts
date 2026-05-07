import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type ToggleRequest = {
  usageId?: string;
  used?: boolean;
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

  let body: ToggleRequest;
  try {
    body = (await request.json()) as ToggleRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  if (!body.usageId || typeof body.used !== "boolean") {
    return NextResponse.json({ error: "usageId and used are required" }, { status: 400 });
  }

  const updateData = body.used
    ? {
        used: true,
        used_at: new Date().toISOString(),
      }
    : {
        used: false,
        used_at: null,
      };

  const { error } = await supabase
    .from("user_benefit_usage")
    .update(updateData)
    .eq("id", body.usageId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Unable to update benefit usage" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
