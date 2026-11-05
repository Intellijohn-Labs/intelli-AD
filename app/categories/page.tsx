import type { Metadata } from "next";
import { CategoryHub } from "@/components/home/category-hub";
import { T } from "@/context/language-context";

export const metadata: Metadata = { title: "Categories & templates" };

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-10 rounded-2xl border border-zinc-200/80 bg-white/95 p-5 shadow-sm backdrop-blur-md sm:p-6 lg:p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-edition"><T k="Category hubs" /></p>
        <h1 className="text-3xl font-black text-navy-900 sm:text-4xl"><T k="Ready-made formats for standard ads" /></h1>
        <p className="mt-2 max-w-2xl text-zinc-700">
          <T k="Start from a pre-formatted notice, then personalise it in the composer. Highlighted fields must be replaced before you can continue." />
        </p>
      </div>
      <CategoryHub />
    </div>
  );
}
