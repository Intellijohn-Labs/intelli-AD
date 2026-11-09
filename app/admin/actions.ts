"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CONFLICT_KEY, validateRows, type RateRow } from "@/lib/rates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  message: string;
}
export interface AdminRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignIn: string | null;
}

const fail = (message: string): ActionResult => ({ ok: false, message });

/** The caller must hold a verified session with app_metadata.role = "admin". Re-checked on every action (never trust the client). */
async function requireAdmin() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const u = data.user;
  if (!u || (u.app_metadata as { role?: string } | undefined)?.role !== "admin") return null;
  return u;
}

const NO_KEY = "SUPABASE_SERVICE_ROLE_KEY isn't set on the server, so admins can't be managed yet.";

const createSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  fullName: z.string().trim().min(2, "Enter the full name.").max(100),
  // Optional: blank → send an invitation email instead.
  password: z.string().max(128).optional().transform((v) => v || undefined),
});

/** Creates an admin with a password, or (no password) emails an invitation. */
export async function createAdmin(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return fail("Not authorised.");
  const admin = createAdminClient();
  if (!admin) return fail(NO_KEY);

  const parsed = createSchema.safeParse({ email: formData.get("email"), fullName: formData.get("fullName"), password: formData.get("password") ?? undefined });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { email, fullName, password } = parsed.data;
  if (password && password.length < 10) return fail("Password must be at least 10 characters.");

  if (password) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "admin" },
      app_metadata: { role: "admin" }, // authoritative: only the service role can set this
    });
    if (error) return fail(/already|registered|exists/i.test(error.message) ? "An account with this email already exists. Use \"Make admin\" below instead." : error.message);
    revalidatePath("/admin/admins");
    return { ok: true, message: `Admin account created for ${email}. Share the password with them securely.` };
  }

  // Invitation: invite first, then set the admin role (inviteUserByEmail can only write user_metadata).
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
  if (error || !data.user) return fail(/already|registered|exists/i.test(error?.message ?? "") ? "An account with this email already exists. Use \"Make admin\" below instead." : (error?.message ?? "Couldn't send the invitation."));
  const { error: roleError } = await admin.auth.admin.updateUserById(data.user.id, { app_metadata: { role: "admin" } });
  if (roleError) return fail(`Invitation sent, but setting the admin role failed: ${roleError.message}`);
  revalidatePath("/admin/admins");
  return { ok: true, message: `Invitation emailed to ${email}.` };
}

/** Promotes an existing account (by email) to admin. */
export async function promoteToAdmin(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return fail("Not authorised.");
  const admin = createAdminClient();
  if (!admin) return fail(NO_KEY);
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return fail("Enter a valid email address.");

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return fail(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.data);
    if (found) {
      const { error: e } = await admin.auth.admin.updateUserById(found.id, { app_metadata: { ...found.app_metadata, role: "admin" } });
      if (e) return fail(e.message);
      revalidatePath("/admin/admins");
      return { ok: true, message: `${email.data} is now an admin. They need to sign out and in again.` };
    }
    if (data.users.length < 200) break;
  }
  return fail("No account with that email.");
}

/** Lists current admins. */
export async function listAdmins(): Promise<AdminRow[] | null> {
  if (!(await requireAdmin())) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const out: AdminRow[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    for (const u of data.users) {
      if ((u.app_metadata as { role?: string } | undefined)?.role === "admin") {
        out.push({ id: u.id, email: u.email ?? "", name: String((u.user_metadata as { full_name?: string } | undefined)?.full_name ?? ""), createdAt: u.created_at, lastSignIn: u.last_sign_in_at ?? null });
      }
    }
    if (data.users.length < 200) break;
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Removes the admin role. You can't remove yourself, and the last admin can't be removed. */
export async function revokeAdmin(userId: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me) return fail("Not authorised.");
  if (!z.uuid().safeParse(userId).success) return fail("Invalid user.");
  if (userId === me.id) return fail("You can't remove your own admin access.");
  const admin = createAdminClient();
  if (!admin) return fail(NO_KEY);
  const all = await listAdmins();
  if (!all?.some((a) => a.id === userId)) return fail("That user isn't an admin.");
  if (all.length <= 1) return fail("You can't remove the last admin.");
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { role: null } });
  if (error) return fail(error.message);
  revalidatePath("/admin/admins");
  return { ok: true, message: "Admin access removed." };
}

export interface SaveRatesResult {
  ok: boolean;
  message: string;
  saved: number;
  cleared: number;
  /** Row-by-row problems (1-based line in the submitted batch + 1 header offset, as in the spreadsheet). */
  errors: { line: number; errors: string[] }[];
}

const MAX_BATCH = 1000;

/**
 * Batch upsert of publication rates (spreadsheet upload and the inline table editor). Admin-only and re-validated
 * on the server, whatever the browser sent. With `allowClear`, rows whose four rate cells are all 0 delete the existing rate.
 */
export async function saveRates(raw: unknown, allowClear = false): Promise<SaveRatesResult> {
  const none = { saved: 0, cleared: 0, errors: [] };
  if (!(await requireAdmin())) return { ok: false, message: "Not authorised.", ...none };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: NO_KEY, ...none };
  if (!Array.isArray(raw) || !raw.length) return { ok: false, message: "Nothing to save.", ...none };
  if (raw.length > MAX_BATCH) return { ok: false, message: `Too many rows at once (max ${MAX_BATCH}).`, ...none };

  const results = validateRows(raw.map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : {})));
  const errors = results.filter((r) => r.errors.length).map((r) => ({ line: r.line, errors: r.errors }));
  if (errors.length) return { ok: false, message: `${errors.length} row${errors.length === 1 ? " has" : "s have"} errors. Nothing was saved.`, saved: 0, cleared: 0, errors };

  const rows = results.filter((r) => r.row).map((r) => ({ ...(r.row as RateRow), updated_at: new Date().toISOString() }));
  if (rows.length) {
    const { error } = await admin.from("publication_rates").upsert(rows, { onConflict: CONFLICT_KEY });
    if (error) return { ok: false, message: error.message, saved: 0, cleared: 0, errors: [] };
  }
  let cleared = 0;
  if (allowClear) {
    for (const r of results.filter((x) => x.skipped && x.key)) {
      const { data, error } = await admin.from("publication_rates").delete().match(r.key!).select("id");
      if (error) return { ok: false, message: `Saved ${rows.length}, but clearing failed: ${error.message}`, saved: rows.length, cleared, errors: [] };
      cleared += data?.length ?? 0;
    }
  }
  revalidatePath("/admin");
  revalidatePath("/admin/rates");
  return { ok: true, message: `${rows.length} rate${rows.length === 1 ? "" : "s"} saved${cleared ? `, ${cleared} cleared` : ""}.`, saved: rows.length, cleared, errors: [] };
}
