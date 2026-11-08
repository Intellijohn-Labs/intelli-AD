import { redirect } from "next/navigation";

/** Partner sign-in now lives on the unified login page. */
export default function AgencyLoginRedirect() {
  redirect("/login?tab=agency");
}
