import type { Metadata } from "next";
import InvitePage from "../../../invitation-cards/invite/[id]/page";

export const metadata: Metadata = { title: "Invitation", robots: { index: false, follow: false } };

/** Alias of /invitation-cards/invite/[id] for invitations shared before the rename. */
export default InvitePage;
