"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/components/contex/ApiProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { RolePrice } from "@/types/role";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "mod", label: "Moderator" },
  { value: "mvp", label: "MVP" },
  { value: "god", label: "God" },
  { value: "vip", label: "VIP" },
  { value: "member", label: "Member" },
] as const;

interface AllRolePricesTableProps {
  /** Increment to trigger table refresh from parent */
  refreshTrigger?: number;
}

const defaultForm = {
  role: "",
  name: "",
  description: "",
  price: "",
  is_active: true,
  sort_order: 0,
};

export function AllRolePricesTable({ refreshTrigger = 0 }: AllRolePricesTableProps) {
  const router = useRouter();
  const { api } = useApi();
  const { toast } = useToast();

  const [rolePrices, setRolePrices] = useState<RolePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RolePrice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RolePrice | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadRolePrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getRolePrices(true); // include inactive for admin
      setRolePrices(response.role_prices || []);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number }; message?: string };
      console.error("Failed to load role prices:", err);
      if (e?.response?.status === 403) {
        setError("Access denied: Admin role required");
        router.push("/");
      } else {
        setError(e?.message || "Failed to load role prices");
      }
    } finally {
      setLoading(false);
    }
  }, [api, router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setError(null);
      const response = await api.getRolePrices(true);
      setRolePrices(response.role_prices || []);
      toast({ title: "Tabel diperbarui", description: "Daftar role price berhasil di-refresh." });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Gagal refresh", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }, [api, toast]);

  useEffect(() => {
    loadRolePrices();
  }, [loadRolePrices]);

  useEffect(() => {
    if (refreshTrigger > 0) loadRolePrices();
  }, [refreshTrigger, loadRolePrices]);

  const resetForm = () => {
    setForm(defaultForm);
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (rp: RolePrice) => {
    setEditTarget(rp);
    setForm({
      role: rp.role,
      name: rp.name,
      description: rp.description || "",
      price: String(rp.price),
      is_active: rp.is_active,
      sort_order: rp.sort_order,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (rp: RolePrice) => {
    setDeleteTarget(rp);
    setDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    const priceNum = parseInt(form.price, 10);
    if (!form.role.trim() || !form.name.trim() || isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Validasi gagal", description: "Role, nama, dan harga harus diisi.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createRolePrice({
        role: form.role.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: priceNum,
        is_active: form.is_active,
        sort_order: form.sort_order,
      });
      setRolePrices((prev) => [...prev, res.role_price]);
      toast({ title: "Role price ditambahkan", description: `${res.role_price.name} berhasil ditambahkan.` });
      setCreateDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Gagal menambah", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    const priceNum = form.price.trim() ? parseInt(form.price, 10) : undefined;
    if (priceNum !== undefined && (isNaN(priceNum) || priceNum < 0)) {
      toast({ title: "Validasi gagal", description: "Harga tidak valid.", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "Validasi gagal", description: "Nama harus diisi.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.updateRolePrice(editTarget.id, {
        role: form.role.trim() ? form.role.trim().toLowerCase() : undefined,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: priceNum,
        is_active: form.is_active,
        sort_order: form.sort_order,
      });
      setRolePrices((prev) => prev.map((rp) => (rp.id === editTarget.id ? res.role_price : rp)));
      toast({ title: "Role price diperbarui", description: `${res.role_price.name} berhasil diperbarui.` });
      setEditDialogOpen(false);
      setEditTarget(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Gagal memperbarui", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteRolePrice(deleteTarget.id);
      setRolePrices((prev) => prev.filter((rp) => rp.id !== deleteTarget.id));
      toast({ title: "Role price dihapus", description: `${deleteTarget.name} berhasil dihapus.` });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Gagal menghapus", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const formFields = (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih role" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500">Role owner tidak bisa memiliki harga.</p>
      </div>
      <div className="space-y-2">
        <Label>Nama</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Contoh: VIP Premium"
        />
      </div>
      <div className="space-y-2">
        <Label>Deskripsi (opsional)</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Deskripsi singkat role"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Harga (Rp)</Label>
        <Input
          type="number"
          min={0}
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <Label>Urutan (sort_order)</Label>
        <Input
          type="number"
          min={0}
          value={form.sort_order}
          onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <Label htmlFor="is_active">Aktif</Label>
      </div>
    </div>
  );

  return (
    <Card className="py-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Role Prices</CardTitle>
            <CardDescription>
              Kelola harga role untuk upgrade ({rolePrices.length} total)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading || refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Memuat..." : "Refresh"}
            </Button>
            <Button size="sm" onClick={openCreateDialog} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {rolePrices.length === 0 && !loading ? (
          <div className="text-center py-8 text-zinc-500">
            <p>Belum ada role price. Klik Tambah untuk menambah.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Urutan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  rolePrices.map((rp) => (
                    <TableRow key={rp.id}>
                      <TableCell className="font-medium">{rp.role}</TableCell>
                      <TableCell>{rp.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-zinc-500">
                        {rp.description || "-"}
                      </TableCell>
                      <TableCell>Rp {rp.price.toLocaleString("id-ID")}</TableCell>
                      <TableCell>{rp.sort_order}</TableCell>
                      <TableCell>
                        <Badge variant={rp.is_active ? "default" : "secondary"}>
                          {rp.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {format(new Date(rp.created_at), "dd MMM yyyy", { locale: id })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(rp)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => openDeleteDialog(rp)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Role Price</DialogTitle>
            <DialogDescription>Tambahkan role baru dengan harga untuk upgrade.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !form.role || !form.name || form.price === ""}>
              {submitting ? "Memproses..." : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role Price</DialogTitle>
            <DialogDescription>Ubah data role price.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={submitting || !form.name}>
              {submitting ? "Memproses..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Role Price</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <span className="font-semibold">{deleteTarget?.name}</span>? Tindakan
              ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
