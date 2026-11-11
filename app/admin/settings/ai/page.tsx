import type { Metadata } from "next";
import { getAiSettings } from "./actions";
import { AiSettingsForm } from "./ai-settings-form";

export const metadata: Metadata = { title: "AI Settings" };

export default async function AiSettingsPage() {
  const s = await getAiSettings();
  if (!s) return <p className="p-6 text-sm text-slate-600">Admin access required.</p>;
  return <AiSettingsForm initial={s} />;
}
