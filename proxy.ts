import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 "proxy" (formerly middleware): keep the staff session fresh on /panel.
export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.next(); // mock mode without keys
  return await updateSession(request);
}

export const config = { matcher: ["/panel/:path*", "/auth/:path*"] };
