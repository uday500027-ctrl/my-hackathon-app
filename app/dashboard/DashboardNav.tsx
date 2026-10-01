"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Scan" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/policies", label: "Policies" },
  { href: "/dashboard/insights", label: "Insights" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard navigation"
      className="flex items-center gap-1 overflow-x-auto whitespace-nowrap py-1 scrollbar-none"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative inline-flex min-h-[40px] items-center px-3.5 py-2 text-sm font-medium transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2",
              isActive
                ? "text-neutral-900 font-semibold dark:text-neutral-100"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/60"
            )}
          >
            {item.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#2f5e3e]"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
