import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Dashboard
          </h1>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-base text-neutral-700 dark:text-neutral-300">
          Signed in as{" "}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {session.name}
          </span>
        </p>
      </main>
    </div>
  );
}
