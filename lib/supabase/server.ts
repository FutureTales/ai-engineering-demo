import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers,
 * acting AS THE LOGGED-IN USER (anon key + session cookie). RLS applies:
 * staff see data through the `private.is_staff()` policies; everyone else sees nothing.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are read-only there. The proxy refreshes the session.
          }
        },
      },
    },
  );
}

/**
 * Verified staff identity: getClaims() validates the JWT (never trust getSession()
 * on the server), and am_i_staff() runs the SAME check as the RLS policies.
 */
export async function getStaffEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.email) return null;
  const { data: isStaff } = await supabase.rpc("am_i_staff");
  return isStaff === true ? String(data.claims.email).toLowerCase() : null;
}
