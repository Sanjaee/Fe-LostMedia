"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Image as ImageIcon,
  Globe,
  Lock,
  EyeOff,
  Users,
  X,
} from "lucide-react";

const CreateGroupPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("open");
  const [membershipPolicy, setMembershipPolicy] = useState("anyone_can_join");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session) {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Maksimal 10MB",
        variant: "destructive",
      });
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removeCover = () => {
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Nama grup diperlukan",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      let res;
      if (coverFile) {
        res = await api.createGroupWithCover(
          name.trim(),
          description.trim() || undefined,
          privacy,
          membershipPolicy,
          coverFile
        );
      } else {
        res = await api.createGroup({
          name: name.trim(),
          description: description.trim() || undefined,
          privacy: privacy as any,
          membership_policy: membershipPolicy as any,
        });
      }

      const data = res as any;
      const group = data.group || data;

      toast({ title: "Grup berhasil dibuat!" });
      router.push(`/groups/${group.slug}`);
    } catch (err: any) {
      toast({
        title: "Gagal membuat grup",
        description: err?.message || "Coba lagi nanti",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const getPrivacyDescription = () => {
    switch (privacy) {
      case "open":
        return "Siapa pun bisa melihat grup dan postingan di dalamnya.";
      case "closed":
        return "Siapa pun bisa menemukan grup, tapi hanya anggota yang bisa melihat postingan.";
      case "secret":
        return "Hanya anggota yang bisa menemukan dan melihat grup.";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4 pb-10">
      <Head>
        <title>Buat Grup - Lost Media</title>
      </Head>

      <div className="container mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Buat Grup
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Photo */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div className="relative h-48 bg-gray-200 dark:bg-gray-800">
              {coverPreview ? (
                <>
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeCover}
                    className="absolute top-3 right-3 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tambahkan foto cover
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
            </div>
          </div>

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-900 dark:text-white">
              Nama Grup <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Masukkan nama grup..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-gray-900 dark:text-white"
            >
              Deskripsi
            </Label>
            <Textarea
              id="description"
              placeholder="Tentang grup ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 min-h-[100px]"
            />
          </div>

          {/* Privacy */}
          <div className="space-y-2">
            <Label className="text-gray-900 dark:text-white">
              Privasi Grup
            </Label>
            <Select value={privacy} onValueChange={setPrivacy}>
              <SelectTrigger className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                <SelectItem value="open">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Publik
                  </div>
                </SelectItem>
                <SelectItem value="closed">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Tertutup
                  </div>
                </SelectItem>
                <SelectItem value="secret">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Rahasia
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getPrivacyDescription()}
            </p>
          </div>

          {/* Membership Policy */}
          <div className="space-y-2">
            <Label className="text-gray-900 dark:text-white">
              Kebijakan Keanggotaan
            </Label>
            <Select
              value={membershipPolicy}
              onValueChange={setMembershipPolicy}
            >
              <SelectTrigger className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                <SelectItem value="anyone_can_join">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Siapa saja bisa bergabung
                  </div>
                </SelectItem>
                <SelectItem value="approval_required">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Perlu persetujuan admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 border-gray-300 dark:border-zinc-700"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {creating ? "Membuat..." : "Buat Grup"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupPage;
