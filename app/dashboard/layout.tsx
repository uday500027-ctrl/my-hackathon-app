import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/app/dashboard/LogoutButton";
import DashboardNav from "@/app/dashboard/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Top bar: sticky, off-white, thin bottom border */}
      <header className="sticky top-0 z-20 border-b border-[#e5e2db] bg-[#fdfcf9] dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            {/* Wordmark linking to "/" */}
            <Link
              href="/"
              className="font-serif text-lg font-bold tracking-tight text-neutral-900 transition-colors hover:text-[#2f5e3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 rounded shrink-0 min-h-[40px] inline-flex items-center dark:text-neutral-100 dark:hover:text-emerald-400"
            >
              PasteGuard
            </Link>
            {/* Links with green underline active state; horizontally scrollable on mobile */}
            <DashboardNav />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden text-sm font-medium text-neutral-600 sm:inline dark:text-neutral-400">
              {session.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Consistent max-w container, py-8 and gap-6 spacing */}
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
