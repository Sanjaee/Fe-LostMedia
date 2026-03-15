"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Payment } from "@/types/payment";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const ALL_STATUS_VALUE = "__all__";
const STATUS_OPTIONS = [
  { value: ALL_STATUS_VALUE, label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

const PAGE_SIZE = 20;

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const v = status?.toLowerCase();
  const isSuccess = v === "success";
  const isError = v === "failed" || v === "expired" || v === "cancelled";
  const variant = isSuccess ? "default" : isError ? "destructive" : v === "pending" ? "secondary" : "outline";
  const label =
    v === "success"
      ? "Success"
      : v === "pending"
        ? "Pending"
        : v === "failed"
          ? "Failed"
          : v === "cancelled"
            ? "Cancelled"
            : v === "expired"
              ? "Expired"
              : status;
  return (
    <Badge
      variant={variant}
      className={
        isSuccess
          ? "border-green-600 bg-green-600 text-white hover:bg-green-600/90"
          : undefined
      }
    >
      {label}
    </Badge>
  );
}

export default function AdminTransactionsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { api } = useApi();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS_VALUE);
  const [loading, setLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminPayments(
        PAGE_SIZE,
        offset,
        statusFilter === ALL_STATUS_VALUE ? undefined : statusFilter
      );
      setPayments(res.payments ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      console.error("Failed to load payments:", err);
      setPayments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [api, offset, statusFilter]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated" || !session) {
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
      return;
    }
    loadPayments();
  }, [session, sessionStatus, router, loadPayments]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4 pb-8">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Link>
            </Button>
          </div>
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2 flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            All Transactions
          </h1>
          <CardDescription>
            List of payments from all users (role upgrade, etc.). Only owners can access.
          </CardDescription>
        </div>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
            <CardTitle>Transactions</CardTitle>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Target Role</TableHead>
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">
                            <span title={p.order_id}>{p.order_id?.slice(0, 20)}…</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{p.customer_name || "—"}</span>
                              <span className="text-xs text-muted-foreground">{p.customer_email || p.user_id}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatUsd(p.total_amount ?? p.amount ?? 0)}</TableCell>
                          <TableCell><StatusBadge status={p.status ?? "pending"} /></TableCell>
                          <TableCell>
                            <span className="capitalize">{p.payment_method || "—"}</span>
                            {p.payment_type && p.payment_type !== "midtrans" && (
                              <span className="text-muted-foreground text-xs ml-1">({p.payment_type === "plisio" ? "crypto" : p.payment_type})</span>
                            )}
                          </TableCell>
                          <TableCell>{p.target_role ? <Badge variant="outline">{p.target_role}</Badge> : "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {p.created_at ? format(new Date(p.created_at), "dd MMM yyyy, HH:mm", { locale: id }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} transactions
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset + PAGE_SIZE >= total}
                      onClick={() => setOffset((o) => o + PAGE_SIZE)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
