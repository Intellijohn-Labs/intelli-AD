import type { Metadata } from "next";
import { CategoryHub } from "@/components/home/category-hub";
import { T } from "@/context/language-context";

export const metadata: Metadata = { title: "Categories & templates" };

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-10 border-b-2 border-[#0F172A] pb-6 dark:border-[#2B3D6B]">
        <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-zinc-600"><T k="Category hubs" /></p>
        <h1 className="font-serif text-3xl font-black text-[#0F172A] sm:text-4xl dark:text-zinc-50"><T k="Ready-made formats for standard ads" /></h1>
        <p className="mt-2 max-w-2xl text-zinc-700">
          <T k="Start from a pre-formatted notice, then personalise it in the composer. Highlighted fields must be replaced before you can continue." />
        </p>
      </div>
      <CategoryHub />
    </div>
  );
}
