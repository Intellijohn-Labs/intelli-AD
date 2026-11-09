import type { Metadata } from "next";
import { listAdmins } from "../actions";
import { AdminManager } from "@/components/admin/admin-manager";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminsPage() {
  const admins = await listAdmins();
  const serviceKey = admins !== null;
  return <AdminManager admins={admins ?? []} serviceKey={serviceKey} />;
}
