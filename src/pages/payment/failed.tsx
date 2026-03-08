"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function PaymentFailedPage() {
  const router = useRouter();
  const orderId = typeof router.query.order_id === "string" ? router.query.order_id : "";

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-8 w-8" />
            <CardTitle>Pembayaran belum selesai</CardTitle>
          </div>
          <CardDescription>
            Faktur belum dibayar atau telah kedaluwarsa. Jika Anda sudah membayar, klik &quot;Ke situs&quot; dari halaman sukses Plisio atau buka halaman Role untuk memeriksa status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="default">
            <Link href="/role">Ke halaman Role</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
