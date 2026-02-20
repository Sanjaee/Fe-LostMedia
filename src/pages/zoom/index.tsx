"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useApi } from "@/components/contex/ApiProvider";
import { api, TokenManager } from "@/lib/api";
import type { Room } from "@/types/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Video, Plus, Users, Calendar, Trash2, Loader2 } from "lucide-react";

function extractRooms(res: any): Room[] {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  if (res?.rooms && Array.isArray(res.rooms)) return res.rooms;
  return [];
}

export default function ZoomRoomsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  useApi();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number | undefined>();
  const [creating, setCreating] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const ensureToken = useCallback(() => {
    let token: string | null = null;
    if (session?.accessToken) {
      token = session.accessToken as string;
      if (session.refreshToken) {
        TokenManager.setTokens(token, session.refreshToken as string);
      }
    } else {
      token = TokenManager.getAccessToken();
    }
    if (token) api.setAccessToken(token);
    return token;
  }, [session]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session) {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent("/zoom"));
      return;
    }
    if (ensureToken()) {
      fetchRooms();
    } else {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent("/zoom"));
    }
  }, [session, status, router]);

  const fetchRooms = async () => {
    if (!ensureToken()) return;
    try {
      setLoading(true);
      const res = await api.getRooms();
      setRooms(extractRooms(res));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Gagal memuat rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Nama room harus diisi",
        variant: "destructive",
      });
      return;
    }
    if (!ensureToken()) {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent("/zoom"));
      return;
    }
    try {
      setCreating(true);
      await api.createRoom({
        name: roomName,
        description: roomDescription || undefined,
        max_participants: maxParticipants || undefined,
      });
      toast({ title: "Sukses", description: "Room berhasil dibuat" });
      setCreateDialogOpen(false);
      setRoomName("");
      setRoomDescription("");
      setMaxParticipants(undefined);
      fetchRooms();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Gagal membuat room",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/zoom/${roomId}`);
  };

  const handleDeleteRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus room ini?")) return;
    if (!ensureToken()) return;
    try {
      setDeletingRoomId(roomId);
      await api.deleteRoom(roomId);
      toast({ title: "Sukses", description: "Room berhasil dihapus" });
      fetchRooms();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Gagal menghapus room",
        variant: "destructive",
      });
    } finally {
      setDeletingRoomId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
              Video Call Rooms
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Buat atau bergabung ke room video call
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Buat Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Buat Room Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Nama Room *</Label>
                  <Input
                    id="name"
                    placeholder="Masukkan nama room"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    placeholder="Opsional"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="maxParticipants">Max Peserta</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    placeholder="Tidak terbatas"
                    value={maxParticipants ?? ""}
                    onChange={(e) =>
                      setMaxParticipants(
                        e.target.value ? parseInt(e.target.value, 10) : undefined
                      )
                    }
                    className="mt-1"
                    min={1}
                  />
                </div>
                <Button
                  onClick={handleCreateRoom}
                  disabled={creating}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    "Buat Room"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">Memuat rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <Card className="p-12 text-center border border-zinc-200 dark:border-zinc-800">
            <Video className="h-16 w-16 mx-auto text-zinc-400 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              Belum ada room
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Buat room pertama Anda untuk memulai video call
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>Buat Room</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card
                key={room.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-600"
                onClick={() => handleJoinRoom(room.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-1 truncate">
                      {room.name}
                    </h3>
                    {room.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {room.description}
                      </p>
                    )}
                  </div>
                  {session?.user?.id === room.created_by_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingRoomId === room.id}
                      className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                      onClick={(e) => handleDeleteRoom(room.id, e)}
                    >
                      {deletingRoomId === room.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                    <Users className="h-4 w-4 mr-2 shrink-0" />
                    {room.participant_count} peserta
                    {room.max_participants != null && ` / ${room.max_participants}`}
                  </div>
                  <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                    <Calendar className="h-4 w-4 mr-2 shrink-0" />
                    {new Date(room.created_at).toLocaleDateString("id-ID")}
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Dibuat oleh: {room.created_by_name}
                  </div>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinRoom(room.id);
                  }}
                >
                  <Video className="mr-2 h-4 w-4" />
                  Gabung Room
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
