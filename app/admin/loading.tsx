/** Shown instantly inside the admin shell (header stays put) while a tab's data loads. */
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-5">
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-blue-100"><div className="h-full w-1/3 animate-[admin-bar_1s_ease-in-out_infinite] bg-blue-600" /></div>
      <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-96 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />)}
      </div>
      <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}
