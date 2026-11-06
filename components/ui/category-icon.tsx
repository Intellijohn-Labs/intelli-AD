import { Briefcase, Building2, FileSignature, Flame, Flower2, Gavel, Heart, Scale, Store, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = { Heart, Building2, Briefcase, Scale, FileSignature, Flame, Flower2, Gavel, Store };

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Store;
  return <Icon className={className} aria-hidden="true" />;
}
