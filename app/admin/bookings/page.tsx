import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Bookings" };

interface Row { booking_ref: string; created_at: string; ad_type: string; category: string; publication: string; status: string; pricing: { total?: number } | null; customer_details: { name?: string } | null }

/** Latest bookings. Read with the service-role key on the server (the public key can't read bookings); the admin layout has already verified the session. */
export default async function BookingsPage() {
  const admin = createAdminClient();
  const { data, error } = admin
    ? await admin.from("bookings").select("booking_ref, created_at, ad_type, category, publication, status, pricing, customer_details").order("created_at", { ascending: false }).limit(100)
    : { data: null, error: { message: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server." } };
  const rows = (data ?? []) as Row[];
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Bookings</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">The 100 most recent bookings.</p>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">Couldn&apos;t load bookings: {error.message}</p>}
      <div className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-100 text-xs text-slate-700"><tr>{["Reference", "Date", "Customer", "Publication", "Type", "Total (₹)", "Status"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {!rows.length && !error && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No bookings yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.booking_ref} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2 font-mono text-xs">{r.booking_ref}</td>
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                <td className="px-3 py-2">{r.customer_details?.name ?? "—"}</td>
                <td className="px-3 py-2">{r.publication}</td>
                <td className="px-3 py-2">{r.ad_type} · {r.category}</td>
                <td className="px-3 py-2">{r.pricing?.total?.toLocaleString("en-IN") ?? "—"}</td>
                <td className="px-3 py-2">{r.status === "confirmed" ? "Confirmed" : "Pending payment"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
