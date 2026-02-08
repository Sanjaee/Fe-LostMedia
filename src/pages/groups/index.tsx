"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Group } from "@/types/group";
import {
  Globe,
  Lock,
  EyeOff,
  Users,
  Plus,
  Search,
  Check,
  UserPlus,
} from "lucide-react";

const GroupsListPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { api } = useApi();

  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session) {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const [myRes, discoverRes] = await Promise.all([
        api.getMyGroups(20, 0),
        api.listGroups(20, 0),
      ]);
      const myData = myRes as any;
      const discoverData = discoverRes as any;
      setMyGroups(myData.groups || []);
      setDiscoverGroups(discoverData.groups || []);
    } catch {
      console.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (session) {
      loadGroups();
    }
  }, [session, loadGroups]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.searchGroups(searchQuery, 20, 0);
      const data = res as any;
      setSearchResults(data.groups || []);
    } catch {
      console.error("Failed to search groups");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "open":
        return <Globe className="h-3.5 w-3.5" />;
      case "closed":
        return <Lock className="h-3.5 w-3.5" />;
      case "secret":
        return <EyeOff className="h-3.5 w-3.5" />;
      default:
        return <Globe className="h-3.5 w-3.5" />;
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)} jt`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)} rb`;
    return count.toString();
  };

  const myGroupIds = new Set(myGroups.map((g) => g.id));

  const GroupCard = ({ group }: { group: Group }) => {
    const joined = myGroupIds.has(group.id);
    return (
      <Link
        href={`/groups/${group.slug}`}
        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
      >
        <div className="h-14 w-14 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
          {group.cover_photo ? (
            <img
              src={group.cover_photo}
              alt={group.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {group.name}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {getPrivacyIcon(group.privacy)}
            <span>{formatCount(group.members_count || 0)} anggota</span>
          </div>
        </div>
        {/* Join status button */}
        <div className="shrink-0">
          {joined ? (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 text-xs font-medium">
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="hidden sm:inline">Bergabung</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Gabung</span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4">
        <Head>
          <title>Grup - Lost Media</title>
        </Head>
        <div className="container mx-auto max-w-3xl px-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-14 w-14 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayGroups = searchQuery.trim() ? searchResults : null;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4 pb-10">
      <Head>
        <title>Grup - Lost Media</title>
      </Head>

      <div className="container mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Grup
          </h1>
          <Link href="/groups/create">
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Buat Grup
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari grup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
          />
        </div>

        {displayGroups ? (
          /* Search Results */
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Hasil Pencarian
            </h2>
            {searching ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-14 w-14 rounded-lg" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayGroups.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
                Tidak ada grup ditemukan
              </p>
            ) : (
              <div className="space-y-2">
                {displayGroups.map((g) => (
                  <GroupCard key={g.id} group={g} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* My Groups */}
            {myGroups.length > 0 && (
              <div className="mb-8">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Grup Saya
                </h2>
                <div className="space-y-2">
                  {myGroups.map((g) => (
                    <GroupCard key={g.id} group={g} />
                  ))}
                </div>
              </div>
            )}

            {/* Discover Groups */}
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
                Temukan Grup
              </h2>
              {discoverGroups.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Belum ada grup. Buat grup pertamamu!
                  </p>
                  <Link href="/groups/create">
                    <Button className="mt-3 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4" />
                      Buat Grup
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {discoverGroups.map((g) => (
                    <GroupCard key={g.id} group={g} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupsListPage;
