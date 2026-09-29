/** Create the staff accounts listed in STAFF_EMAILS (signups are disabled). Run: pnpm tsx scripts/create-staff-users.mts */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { createAdminClient } from "../lib/supabase/admin";
const db = createAdminClient();
for (const email of (process.env.STAFF_EMAILS ?? "").split(",").filter(Boolean)) {
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  console.log(email, error ? `error: ${error.message}` : `created ${data.user?.id.slice(0, 8)}…`);
}
