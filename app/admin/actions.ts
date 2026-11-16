"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { newspapers } from "@/data/newspapers";
import { CONFLICT_KEY, ROW_EXTRA_COLUMNS, validateRows, type RateRow } from "@/lib/rates";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdminUser } from "@/lib/supabase/session";

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
  const u = await getSessionUser();
  return isAdminUser(u) ? u : null;
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
  const admin = createAdminClient();
  if (!admin) return null;
  // The first page of users is fetched while the caller's admin role is being verified.
  const first = admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const [ok, firstPage] = await Promise.all([requireAdmin(), first]);
  if (!ok) return null;
  const out: AdminRow[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = page === 1 ? firstPage : await admin.auth.admin.listUsers({ page, perPage: 200 });
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

  // The exact printed colour rate (₹/cm²) isn't a spreadsheet column, so it's carried alongside the validated row.
  // Spreadsheet rows carry no per-word / exact-colour columns, so those keys are simply not written (existing values stay).
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

const settingsSchema = z.object({
  newspaperName: z.string(),
  // null = every day / every edition
  printDays: z.array(z.number().int().min(0).max(6)).max(7).nullable(),
  enabledEditions: z.array(z.string()).nullable(),
});

/** Saves a newspaper's print schedule (weekdays it prints) and which of its editions are offered for booking. */
export async function savePaperSettings(input: unknown): Promise<ActionResult> {
  if (!(await requireAdmin())) return fail("Not authorised.");
  const admin = createAdminClient();
  if (!admin) return fail(NO_KEY);
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid settings.");
  const { newspaperName, printDays, enabledEditions } = parsed.data;
  const paper = newspapers.find((n) => n.name === newspaperName);
  if (!paper) return fail("Unknown newspaper.");
  if (printDays && printDays.length === 0) return fail("Select at least one print day.");
  if (enabledEditions) {
    if (enabledEditions.length === 0) return fail("Enable at least one edition.");
    const known = new Set(paper.editions.map((e) => e.name));
    if (enabledEditions.some((e) => !known.has(e))) return fail("Unknown edition in the list.");
  }
  const all = enabledEditions && enabledEditions.length === paper.editions.length;
  const { error } = await admin.from("newspaper_settings").upsert(
    { newspaper_name: paper.name, print_days: printDays && printDays.length < 7 ? [...new Set(printDays)].sort() : null, enabled_editions: all ? null : enabledEditions, updated_at: new Date().toISOString() },
    { onConflict: "newspaper_name" },
  );
  if (error) return fail(/does not exist|schema cache/i.test(error.message) ? "The newspaper_settings table doesn't exist yet. Run supabase/schema.sql in Supabase." : error.message);
  revalidatePath("/admin/rates");
  return { ok: true, message: `${paper.name} settings saved.` };
}

/** Deletes every saved rate and limit row for one newspaper (its print schedule / edition list in newspaper_settings is kept). */
export async function clearNewspaperRates(newspaperName: unknown): Promise<ActionResult & { deleted: number }> {
  const bad = (message: string) => ({ ok: false, message, deleted: 0 });
  if (!(await requireAdmin())) return bad("Not authorised.");
  const admin = createAdminClient();
  if (!admin) return bad(NO_KEY);
  const paper = newspapers.find((n) => n.name === newspaperName);
  if (!paper) return bad("Unknown newspaper.");
  const { data, error } = await admin.from("publication_rates").delete().eq("newspaper_name", paper.name).select("id");
  if (error) return bad(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/rates");
  return { ok: true, message: `All rates for ${paper.name} have been cleared.`, deleted: data?.length ?? 0 };
}

// ── PDF rate card import: replace a publication's rates, and purge legacy rates ───────────────────────────────────────

const EXTRAS_TABLE = "publication_extras";
const extrasMissing = (m: string) => /does not exist|schema cache|relation .* does not exist|could not find the table/i.test(m);
const extraSchema = z.object({
  kind: z.enum(["page_premium", "combo", "addon"]),
  name: z.string().trim().min(1).max(120),
  data: z.record(z.string(), z.unknown()),
});
const replaceSchema = z.object({
  newspaperName: z.string(),
  mode: z.enum(["merge", "replace"]).default("merge"),
  rows: z.array(z.record(z.string(), z.unknown())).max(MAX_BATCH),
  extras: z.array(extraSchema).max(800).default([]),
  meta: z.object({ fileName: z.string().max(200).default(""), effectiveDate: z.string().max(20).nullable().default(null), engine: z.string().max(60).default("") }).default({ fileName: "", effectiveDate: null, engine: "" }),
});
export interface ReplaceResult extends ActionResult { saved: number; removed: number; extrasSaved: boolean; warning?: string }

/**
 * Replaces ALL of one publication's rates with the reviewed PDF import: the new rows are upserted first, then every
 * older row (seed / dummy / previous upload) for that newspaper that isn't in the new set is deleted. If the upsert
 * fails nothing is deleted. Page premiums, combos and add-on percentages are replaced the same way, and the import is
 * recorded so "Purge legacy rates" keeps it.
 */
export async function replacePublicationRates(input: unknown): Promise<ReplaceResult> {
  const none = { saved: 0, removed: 0, extrasSaved: false };
  const bad = (message: string): ReplaceResult => ({ ok: false, message, ...none });
  if (!(await requireAdmin())) return bad("Not authorised.");
  const admin = createAdminClient();
  if (!admin) return bad(NO_KEY);
  const parsed = replaceSchema.safeParse(input);
  if (!parsed.success) return bad("Invalid import data.");
  const { newspaperName, mode, rows: raw, extras, meta } = parsed.data;
  const paper = newspapers.find((n) => n.name === newspaperName);
  if (!paper) return bad("Unknown newspaper.");
  if (!raw.length) return bad("Nothing to save.");

  const results = validateRows(raw);
  const errors = results.filter((r) => r.errors.length);
  if (errors.length) return bad(`${errors.length} row${errors.length === 1 ? " has" : "s have"} errors (row ${errors[0].line}: ${errors[0].errors[0]}). Nothing was saved.`);
  const rows = results.filter((r) => r.row).map((r) => ({ ...(r.row as RateRow), updated_at: new Date().toISOString() }));
  if (rows.some((r) => r.newspaper_name !== paper.name)) return bad(`Every row must be for ${paper.name}.`);
  if (!rows.length) return bad("No rates with values to save.");

  let upErr = (await admin.from("publication_rates").upsert(rows, { onConflict: CONFLICT_KEY })).error;
  let colourWarning: string | undefined;
  if (upErr && /color_sq_cm_rate|word_rate|caps_word_rate|heading_line_rate|min_words/i.test(upErr.message)) {
    // New columns not created yet. Per-word rates can't be saved without them: refuse. Colour-only: save without the exact colour rate and say so.
    if (rows.some((r) => (r.word_rate ?? 0) > 0)) return bad("This card has per-word classified rates, but the database doesn't have the per-word columns yet. Run the new `alter table … word_rate` SQL block at the end of supabase/schema.sql, then save again. Nothing was saved.");
    upErr = (await admin.from("publication_rates").upsert(rows.map((r) => { const o = { ...r } as Record<string, unknown>; for (const k of ROW_EXTRA_COLUMNS) delete o[k]; return o; }), { onConflict: CONFLICT_KEY })).error;
    colourWarning = "The exact colour-rate column doesn't exist yet, so colour uses the rounded percentage. Run the new `alter table … color_sq_cm_rate` SQL in supabase/schema.sql, then import again.";
  }
  if (upErr) return bad(upErr.message);

  // Replace mode: remove every older row for this publication that is not part of the new set. Merge mode keeps them.
  const keep = new Set(rows.map((r) => [r.edition, r.category, r.ad_type].join("|")));
  const { data: existing, error: listErr } = mode === "replace" ? await admin.from("publication_rates").select("id,edition,category,ad_type").eq("newspaper_name", paper.name) : { data: [], error: null };
  if (listErr) return { ok: false, message: `Saved ${rows.length}, but couldn't remove older rates: ${listErr.message}`, saved: rows.length, removed: 0, extrasSaved: false };
  const stale = (existing ?? []).filter((r) => !keep.has([r.edition, r.category, r.ad_type].join("|"))).map((r) => r.id as string);
  for (let i = 0; i < stale.length; i += 200) {
    const { error } = await admin.from("publication_rates").delete().in("id", stale.slice(i, i + 200));
    if (error) return { ok: false, message: `Saved ${rows.length}, but removing older rates failed: ${error.message}`, saved: rows.length, removed: i, extrasSaved: false };
  }

  // Extras (page premiums, combos, add-ons) + the import record. Optional: the table may not exist yet.
  // Merge mode: a later PDF (e.g. Classifieds) must not blank add-on values an earlier one (e.g. Display) printed.
  if (mode === "merge") {
    const { data: oldAddons } = await admin.from(EXTRAS_TABLE).select("name,data").eq("newspaper_name", paper.name).eq("kind", "addon");
    for (const x of extras) {
      if (x.kind !== "addon") continue;
      const prev = (oldAddons ?? []).find((o) => o.name === x.name)?.data as Record<string, unknown> | undefined;
      if (prev) x.data = { ...prev, ...Object.fromEntries(Object.entries(x.data).filter(([, v]) => v != null)) };
    }
  }
  const items = [
    ...extras.map((x) => ({ newspaper_name: paper.name, kind: x.kind, name: x.name, data: x.data })),
    { newspaper_name: paper.name, kind: "import_meta" as const, name: "pdf", data: { importedAt: new Date().toISOString(), rowCount: rows.length, ...meta } },
  ].map((x) => ({ ...x, updated_at: new Date().toISOString() }));
  let extrasSaved = false, warning: string | undefined;
  const { error: exErr } = await admin.from(EXTRAS_TABLE).upsert(items, { onConflict: "newspaper_name,kind,name" });
  if (exErr) warning = extrasMissing(exErr.message) ? "Rates saved, but the publication_extras table doesn't exist yet, so page premiums, combos and add-on percentages were not saved. Run the new SQL block in supabase/schema.sql, then import again." : `Rates saved, but extras failed: ${exErr.message}`;
  else {
    extrasSaved = true;
    if (mode === "replace") {
    const keepX = new Set(items.map((x) => `${x.kind}|${x.name}`));
    const { data: oldX } = await admin.from(EXTRAS_TABLE).select("id,kind,name").eq("newspaper_name", paper.name);
    const staleX = (oldX ?? []).filter((x) => !keepX.has(`${x.kind}|${x.name}`)).map((x) => x.id as string);
    if (staleX.length) await admin.from(EXTRAS_TABLE).delete().in("id", staleX);
    }
  }
  if (colourWarning) warning = [warning, colourWarning].filter(Boolean).join(" ");
  revalidatePath("/admin");
  revalidatePath("/admin/rates");
  return { ok: true, message: mode === "merge" ? `${paper.name}: ${rows.length} rate${rows.length === 1 ? "" : "s"} merged (added or updated); existing rows kept.` : `${paper.name}: ${rows.length} rate${rows.length === 1 ? "" : "s"} saved, ${stale.length} older rate${stale.length === 1 ? "" : "s"} removed.`, saved: rows.length, removed: stale.length, extrasSaved, warning };
}

/**
 * Deletes every rate (and extra) for publications that have NO verified PDF import, i.e. pre-seeded / hand-typed /
 * dummy data. Publications with a recorded PDF import are untouched. Refuses to run if the import records can't be read.
 */
export async function purgeLegacyRates(): Promise<ActionResult & { deleted: number; kept: string[] }> {
  const bad = (message: string) => ({ ok: false, message, deleted: 0, kept: [] as string[] });
  if (!(await requireAdmin())) return bad("Not authorised.");
  const admin = createAdminClient();
  if (!admin) return bad(NO_KEY);
  const { data: meta, error } = await admin.from(EXTRAS_TABLE).select("newspaper_name").eq("kind", "import_meta");
  if (error) return bad(extrasMissing(error.message) ? "Can't tell which publications are PDF-verified: the publication_extras table doesn't exist yet. Run the new SQL block in supabase/schema.sql first. Nothing was deleted." : error.message);
  const verified = new Set((meta ?? []).map((m) => m.newspaper_name as string));
  const toPurge = newspapers.map((n) => n.name).filter((n) => !verified.has(n));
  let deleted = 0;
  if (toPurge.length) {
    const { count, error: delErr } = await admin.from("publication_rates").delete({ count: "exact" }).in("newspaper_name", toPurge);
    if (delErr) return bad(delErr.message);
    deleted = count ?? 0;
    await admin.from(EXTRAS_TABLE).delete().in("newspaper_name", toPurge);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/rates");
  return { ok: true, message: deleted ? `Purged ${deleted} legacy rate${deleted === 1 ? "" : "s"}; ${verified.size} PDF-verified publication${verified.size === 1 ? "" : "s"} kept.` : `Nothing to purge. ${verified.size} PDF-verified publication${verified.size === 1 ? "" : "s"} kept.`, deleted, kept: [...verified] };
}
