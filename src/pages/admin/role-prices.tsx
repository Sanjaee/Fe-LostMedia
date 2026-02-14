"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AllRolePricesTable } from "@/components/admin/AllRolePricesTable";
import { Button } from "@/components/ui/button";

export default function AdminRolePricesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session) {
      router.push("/auth/login");
      return;
    }

    const userType =
      session.userType ||
      session.user?.userType ||
      session.user?.user_type ||
      session.user?.role ||
      (session.user as { user_type?: string })?.user_type ||
      (session.user as { userType?: string })?.userType;

    if (userType !== "owner") {
      router.push("/");
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4 pb-8">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Admin
            </Link>
          </Button>
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Kelola Role Prices
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Tambah, edit, dan hapus harga role untuk upgrade
          </p>
        </div>

        <AllRolePricesTable />
      </div>
    </div>
  );
}
