"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkLoginLimit, hashIp } from "@/lib/guardrails/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const allow = (process.env.STAFF_EMAILS ?? "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim());
  // Same answer whether or not the email is allowed, so the form does not reveal who is staff.
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const withinLimit = await checkLoginLimit(hashIp(ip)).catch(() => false);
  if (withinLimit && email && allow.includes(email)) {
    const origin = h.get("origin") ?? "https://innova-copilot.vercel.app";
    const supabase = await createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm?next=/panel` },
    });
  }
  redirect("/panel/login?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/panel/login");
}
