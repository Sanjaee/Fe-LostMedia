"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { api, TokenManager } from "@/lib/api";
import type { JoinRoomResponse } from "@/types/room";
import {
  Room,
  RemoteParticipant,
  RoomEvent,
  Track,
  getEmptyAudioStreamTrack,
  getEmptyVideoStreamTrack,
} from "livekit-client";
import ChatSidebar from "@/components/zoom/ChatSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  MessageSquare,
  X,
  SwitchCamera,
  Monitor,
  MonitorOff,
} from "lucide-react";

export default function ZoomCallPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { roomId } = router.query;
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [enableDeviceDialog, setEnableDeviceDialog] = useState<"mic" | "camera" | null>(null);
  const [loadingDeviceDialogDismissed, setLoadingDeviceDialogDismissed] = useState(false);
  const [usingDummyMic, setUsingDummyMic] = useState(false);
  const [usingDummyCamera, setUsingDummyCamera] = useState(false);

  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const screenShareElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenShareRef = useRef<HTMLVideoElement>(null);
  const isJoiningRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const enableMicCameraOnJoinRef = useRef(false);

  roomRef.current = room;
  roomIdRef.current = typeof roomId === "string" ? roomId : null;

  // Keluar dari room saat user meninggalkan halaman (navigasi/close)
  useEffect(() => {
    return () => {
      const r = roomRef.current;
      const id = roomIdRef.current;
      if (r?.state === "connected") {
        r.disconnect(true).catch(() => {});
      }
      if (id) api.leaveRoom(id).catch(() => {});
      hasJoinedRef.current = false;
      isJoiningRef.current = false;
    };
  }, []);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setChatOpen(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const attachTrack = useCallback((track: Track, participant: RemoteParticipant) => {
    if (track.kind === "video") {
      const pub = participant.getTrackPublication(track.source);
      const isScreenShare = pub?.source === Track.Source.ScreenShare;
      const map = isScreenShare ? screenShareElementsRef : videoElementsRef;
      let el = map.current.get(participant.identity);
      if (!el) {
        el = document.createElement("video");
        el.autoplay = true;
        el.playsInline = true;
        el.className = isScreenShare ? "w-full h-full object-contain" : "w-full h-full object-cover rounded-lg";
        map.current.set(participant.identity, el);
      }
      track.attach(el);
    } else if (track.kind === "audio") {
      const el = track.attach();
      document.body.appendChild(el);
    }
  }, []);

  const joinRoom = useCallback(
    async (id: string) => {
      if (isJoiningRef.current || hasJoinedRef.current) return;
      if (room?.state === "connected") {
        setLoading(false);
        return;
      }
      isJoiningRef.current = true;
      try {
        setLoading(true);
        setError(null);
        if (room) await room.disconnect().catch(() => {});

        const token: string | null = (session?.accessToken as string) || TokenManager.getAccessToken();
        if (session?.refreshToken) TokenManager.setTokens(session.accessToken as string, session.refreshToken as string);
        if (!token) throw new Error("Silakan login kembali.");
        api.setAccessToken(token);

        const data = await api.joinRoom(id) as JoinRoomResponse;
        const tokenVal = data.token ?? (data as any).data?.token;
        const url = data.url ?? (data as any).data?.url;
        if (!tokenVal || !url) throw new Error("Token atau URL tidak valid.");

        const newRoom = new Room({ adaptiveStream: true, dynacast: true });

        newRoom.on(RoomEvent.ParticipantConnected, (p) => {
          setParticipants((prev) => new Map(prev).set(p.identity, p));
        });
        newRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
          setParticipants((prev) => {
            const next = new Map(prev);
            next.delete(p.identity);
            return next;
          });
          const v = videoElementsRef.current.get(p.identity);
          if (v) {
            v.srcObject = null;
            videoElementsRef.current.delete(p.identity);
          }
          const s = screenShareElementsRef.current.get(p.identity);
          if (s) {
            s.srcObject = null;
            screenShareElementsRef.current.delete(p.identity);
          }
        });
        newRoom.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          attachTrack(track, participant);
          setParticipants((prev) => new Map(prev).set(participant.identity, participant));
        });
        newRoom.on(RoomEvent.TrackPublished, (_pub, participant) => {
          setParticipants((prev) => new Map(prev).set(participant.identity, participant));
        });
        newRoom.on(RoomEvent.LocalTrackPublished, (pub) => {
          if (pub.kind === "video" && pub.track) {
            if (pub.source === Track.Source.ScreenShare && localScreenShareRef.current) {
              pub.track.attach(localScreenShareRef.current);
              setIsScreenSharing(true);
            } else if (pub.source === Track.Source.Camera && localVideoRef.current) {
              pub.track.attach(localVideoRef.current);
            }
          }
          if (pub.kind === "audio") setIsMicMuted(!newRoom.localParticipant.isMicrophoneEnabled);
        });
        newRoom.on(RoomEvent.LocalTrackUnpublished, () => {
          setIsMicMuted(!newRoom.localParticipant.isMicrophoneEnabled);
          setIsCameraOff(!newRoom.localParticipant.isCameraEnabled);
          if (localScreenShareRef.current) localScreenShareRef.current.srcObject = null;
          setIsScreenSharing(false);
        });
        newRoom.on(RoomEvent.TrackUnsubscribed, (track) => track.detach());

        // Connect tanpa publish mic/camera; timeout & retry lebih longgar agar PC connection tidak gagal
        await newRoom.connect(url, tokenVal, {
          autoSubscribe: true,
          maxRetries: 4,
          peerConnectionTimeout: 30_000,
          websocketTimeout: 20_000,
        });

        const existing = new Map<string, RemoteParticipant>();
        newRoom.remoteParticipants.forEach((p) => {
          existing.set(p.identity, p);
          p.trackPublications.forEach((pub) => {
            if (pub.track) attachTrack(pub.track, p);
          });
        });
        setParticipants(existing);
        setRoom(newRoom);
        hasJoinedRef.current = true;
        setLoading(false);
        // Bergabung tanpa mic & kamera; user bisa nyalakan nanti lewat tombol
        setIsMicMuted(true);
        setIsCameraOff(true);
        // Jika user pilih "Aktifkan setelah terhubung" di dialog loading, nyalakan mic & kamera sekarang
        if (enableMicCameraOnJoinRef.current) {
          enableMicCameraOnJoinRef.current = false;
          try {
            await newRoom.localParticipant.enableCameraAndMicrophone();
            setIsMicMuted(false);
            setIsCameraOff(false);
            const pub = newRoom.localParticipant.getTrackPublication(Track.Source.Camera);
            if (pub?.track && localVideoRef.current) pub.track.attach(localVideoRef.current);
          } catch {
            // Izin ditolak atau error; tetap masuk tanpa mic/kamera
          }
        } else {
          // Publish track dummy (audio diam + video hitam) agar koneksi tetap jalan tanpa izin mic/kamera
          try {
            await newRoom.localParticipant.publishTrack(getEmptyAudioStreamTrack(), {
              name: "microphone",
              source: Track.Source.Microphone,
            });
            setUsingDummyMic(true);
          } catch {
            // Abaikan jika publish dummy audio gagal
          }
          try {
            await newRoom.localParticipant.publishTrack(getEmptyVideoStreamTrack(), {
              name: "camera",
              source: Track.Source.Camera,
            });
            setUsingDummyCamera(true);
          } catch {
            // Abaikan jika publish dummy video gagal
          }
        }
      } catch (err: any) {
        const msg = err.message || err.response?.data?.message || "Gagal bergabung";
        setError(msg);
        setLoading(false);
        hasJoinedRef.current = false;
        toast({ title: "Error", description: msg, variant: "destructive" });
        if (err.response?.status === 401) setTimeout(() => router.push("/auth/login"), 2000);
      } finally {
        isJoiningRef.current = false;
      }
    },
    [session, room, attachTrack, router, toast]
  );

  useEffect(() => {
    if (room?.state !== "connected") return;
    if (usingDummyMic || usingDummyCamera) return;
    setIsMicMuted(!room.localParticipant.isMicrophoneEnabled);
    setIsCameraOff(!room.localParticipant.isCameraEnabled);
  }, [room, usingDummyMic, usingDummyCamera]);

  // Attach local camera track to video element when ref is ready (fixes "Anda" not showing)
  useEffect(() => {
    if (!room || room.state !== "connected" || isCameraOff || usingDummyCamera) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (!pub?.track) return;
    const id = requestAnimationFrame(() => {
      const el = localVideoRef.current;
      if (el) pub.track!.attach(el);
    });
    return () => cancelAnimationFrame(id);
  }, [room, isCameraOff, usingDummyCamera]);

  useEffect(() => {
    // Tunggu router siap (penting di mobile/Chrome agar roomId tidak undefined)
    if (!router.isReady || status === "loading" || !roomId || typeof roomId !== "string") return;
    if (hasJoinedRef.current || isJoiningRef.current) return;
    const token = session?.accessToken ?? TokenManager.getAccessToken();
    if (!token) {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent(`/zoom/${roomId}`));
      return;
    }
    api.setAccessToken(token);
    joinRoom(roomId);
    return () => {
      const r = roomRef.current;
      if (r?.state === "connected") r.disconnect().catch(() => {});
      hasJoinedRef.current = false;
      isJoiningRef.current = false;
    };
    // joinRoom sengaja tidak di-deps agar cleanup tidak disconnect saat room baru ter-set
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only run on route/auth change
  }, [router.isReady, roomId, session, status, router]);

  const doEnableMic = async () => {
    if (!room || room.state !== "connected") return;
    try {
      if (usingDummyMic) {
        const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (pub?.track) await room.localParticipant.unpublishTrack(pub.track, false);
        setUsingDummyMic(false);
      }
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMicMuted(false);
      setEnableDeviceDialog(null);
    } catch (e: any) {
      if (e?.name === "NotAllowedError") toast({ title: "Izin mikrofon diperlukan", variant: "default" });
      setEnableDeviceDialog(null);
    }
  };

  const doEnableCamera = async () => {
    if (!room || room.state !== "connected") return;
    try {
      if (usingDummyCamera) {
        const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (pub?.track) await room.localParticipant.unpublishTrack(pub.track, false);
        setUsingDummyCamera(false);
      }
      await room.localParticipant.setCameraEnabled(true);
      setIsCameraOff(false);
      setEnableDeviceDialog(null);
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub?.track && localVideoRef.current) pub.track.attach(localVideoRef.current);
    } catch (e: any) {
      if (e?.name === "NotAllowedError") toast({ title: "Izin kamera diperlukan", variant: "default" });
      setEnableDeviceDialog(null);
    }
  };

  const toggleMic = () => {
    if (!room || room.state !== "connected") return;
    if (isMicMuted) {
      setEnableDeviceDialog("mic");
    } else {
      room.localParticipant.setMicrophoneEnabled(false).then(() => setIsMicMuted(true)).catch(() => {});
    }
  };

  const toggleCamera = () => {
    if (!room || room.state !== "connected") return;
    if (isCameraOff) {
      setEnableDeviceDialog("camera");
    } else {
      room.localParticipant.setCameraEnabled(false).then(() => {
        setIsCameraOff(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
      }).catch(() => {});
    }
  };

  const switchCamera = async () => {
    if (!room || room.state !== "connected" || isSwitchingCamera || !room.localParticipant.isCameraEnabled) return;
    try {
      setIsSwitchingCamera(true);
      const newMode = facingMode === "user" ? "environment" : "user";
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub?.track) await room.localParticipant.unpublishTrack(pub.track);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: newMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const track = stream.getVideoTracks()[0];
      await room.localParticipant.publishTrack(track, { name: "camera", source: Track.Source.Camera });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setFacingMode(newMode);
      setIsCameraOff(false);
    } catch {
      toast({ title: "Gagal mengganti kamera", variant: "destructive" });
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const toggleScreenShare = async () => {
    if (!room || room.state !== "connected") return;
    try {
      if (isScreenSharing) {
        const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        if (pub?.track) {
          await room.localParticipant.unpublishTrack(pub.track);
          pub.track.stop();
        }
        if (localScreenShareRef.current) localScreenShareRef.current.srcObject = null;
        setIsScreenSharing(false);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const track = stream.getVideoTracks()[0];
        track.onended = () => {
          setIsScreenSharing(false);
          const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
          if (pub?.track) room.localParticipant.unpublishTrack(pub.track).catch(() => {});
        };
        if (localScreenShareRef.current) localScreenShareRef.current.srcObject = stream;
        await room.localParticipant.publishTrack(track, { name: "screen-share", source: Track.Source.ScreenShare });
        setIsScreenSharing(true);
      }
    } catch (e: any) {
      if (e?.name === "NotAllowedError") toast({ title: "Izin share layar diperlukan", variant: "default" });
    }
  };

  const leaveRoom = async () => {
    if (room?.state === "connected") {
      try {
        for (const pub of room.localParticipant.trackPublications.values()) {
          if (pub.track) await room.localParticipant.unpublishTrack(pub.track).catch(() => {});
        }
        await room.disconnect();
      } catch {}
      setRoom(null);
      hasJoinedRef.current = false;
      isJoiningRef.current = false;
    }
    if (roomId && typeof roomId === "string") await api.leaveRoom(roomId).catch(() => {});
    setParticipants(new Map());
    videoElementsRef.current.clear();
    screenShareElementsRef.current.clear();
    setIsMicMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setUsingDummyMic(false);
    setUsingDummyCamera(false);
    await new Promise((r) => setTimeout(r, 300));
    router.push("/zoom");
  };

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center max-w-xs px-4">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Menghubungkan ke room...</p>
            <p className="text-gray-500 text-sm mt-2">
              Anda masuk tanpa mikrofon dan kamera. Nyalakan dari tombol di bawah setelah terhubung.
            </p>
          </div>
        </div>

        <Dialog
          open={!loadingDeviceDialogDismissed}
          onOpenChange={(open) => {
            if (!open) setLoadingDeviceDialogDismissed(true);
          }}
        >
          <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-md" showCloseButton={true}>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Mic className="h-5 w-5" />
                <Video className="h-5 w-5" />
                Aktifkan mic & kamera setelah terhubung?
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Setelah koneksi berhasil, mikrofon dan kamera akan otomatis diaktifkan. Browser akan meminta izin akses.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300"
                onClick={() => setLoadingDeviceDialogDismissed(true)}
              >
                Tidak, masuk tanpa mic & kamera
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  enableMicCameraOnJoinRef.current = true;
                  setLoadingDeviceDialogDismissed(true);
                }}
              >
                Ya, aktifkan setelah terhubung
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-6 max-w-md w-full bg-gray-800 border-gray-700">
            <h2 className="text-xl font-bold text-white mb-3">Error</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => router.push("/zoom")} className="w-full">Kembali ke Rooms</Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  if (roomId && typeof roomId === "string") joinRoom(roomId);
                }}
              >
                Coba Lagi
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const participantCount = participants.size + 1;
  const hasActiveScreenShare =
    isScreenSharing ||
    Array.from(participants.values()).some((p) => {
      const pub = p.getTrackPublication(Track.Source.ScreenShare);
      return pub?.isSubscribed && pub.track;
    });
  const activeScreenShareParticipant =
    Array.from(participants.values()).find((p) => {
      const pub = p.getTrackPublication(Track.Source.ScreenShare);
      return pub?.isSubscribed && pub.track;
    }) || (isScreenSharing ? room?.localParticipant : null);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 px-4 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white truncate">
            Room: {typeof roomId === "string" ? roomId.slice(0, 12) + (roomId.length > 12 ? "..." : "") : ""}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-700 px-3 py-1.5 rounded-full">
              <Users className="h-4 w-4 text-gray-300" />
              <span className="text-white text-sm">{participantCount}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setChatOpen(!chatOpen)} className="relative text-gray-300 hover:text-white">
              <MessageSquare className="h-5 w-5" />
              {isMobile && !chatOpen && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {hasActiveScreenShare && activeScreenShareParticipant ? (
            <div className="flex-1 relative bg-gray-900">
              <div className="absolute inset-0">
                {activeScreenShareParticipant === room?.localParticipant ? (
                  <video ref={localScreenShareRef} className="w-full h-full object-contain" autoPlay playsInline muted />
                ) : (
                  <div
                    ref={(el) => {
                      if (el) {
                        const s = screenShareElementsRef.current.get(activeScreenShareParticipant.identity);
                        if (s && !el.contains(s)) el.appendChild(s);
                      }
                    }}
                    className="w-full h-full"
                  />
                )}
              </div>
              <div className="absolute bottom-4 right-4 w-64 h-48 sm:w-80 sm:h-60 rounded-lg overflow-hidden shadow-xl border-2 border-gray-700 bg-gray-800 z-10">
                {!isCameraOff ? (
                  <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                ) : (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    <VideoOff className="h-12 w-12 text-gray-600" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 text-xs text-white bg-black/70 px-2 py-1 rounded">Anda</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                <Card className="relative aspect-video bg-gray-800 overflow-hidden border-0">
                  {!isCameraOff ? (
                    <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <VideoOff className="h-12 w-12 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 text-xs text-white bg-black/70 px-2 py-1 rounded">Anda</div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {isMicMuted && <div className="bg-red-600/90 rounded-full p-1"><MicOff className="h-3 w-3 text-white" /></div>}
                    {isCameraOff && <div className="bg-red-600/90 rounded-full p-1"><VideoOff className="h-3 w-3 text-white" /></div>}
                  </div>
                </Card>
                {Array.from(participants.entries()).map(([identity, p]) => {
                  const camPub = p.getTrackPublication(Track.Source.Camera);
                  const micPub = p.getTrackPublication(Track.Source.Microphone);
                  const camOff = !camPub?.isSubscribed || !camPub.track;
                  const micMuted = !micPub?.isSubscribed || micPub.isMuted;
                  const noMediaYet = !camPub?.track && !micPub?.track;
                  return (
                    <Card key={identity} className="relative aspect-video bg-gray-800 overflow-hidden border-0">
                      {noMediaYet ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-900/80 p-4">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
                          <p className="text-gray-400 text-xs text-center">
                            Menunggu <span className="text-white truncate block max-w-full">{identity}</span> terhubung
                          </p>
                        </div>
                      ) : (
                        <div
                          ref={(el) => {
                            if (el) {
                              const v = videoElementsRef.current.get(identity);
                              if (v && !el.contains(v)) el.appendChild(v);
                            }
                          }}
                          className="w-full h-full bg-gray-900"
                        />
                      )}
                      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/70 px-2 py-1 rounded truncate max-w-[80%]">{identity}</div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        {micMuted && <div className="bg-red-600/90 rounded-full p-1"><MicOff className="h-3 w-3 text-white" /></div>}
                        {camOff && !noMediaYet && <div className="bg-red-600/90 rounded-full p-1"><VideoOff className="h-3 w-3 text-white" /></div>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {!isMobile && chatOpen && session?.user?.id && (
            <div className="w-80 border-l border-gray-700 shrink-0 flex flex-col min-h-0">
              <ChatSidebar roomId={roomId as string} userId={session.user.id} isOpen={chatOpen} />
            </div>
          )}

          {isMobile && chatOpen && session?.user?.id && (
            <>
              <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setChatOpen(false)} />
              <div className="fixed inset-x-0 bottom-0 top-14 z-50 md:hidden bg-gray-800 rounded-t-2xl flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                  <h3 className="font-semibold text-white">Chat</h3>
                  <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatSidebar roomId={roomId as string} userId={session.user.id} isOpen={chatOpen} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-800 px-4 py-3 flex justify-center gap-3 flex-wrap">
          <Button
            onClick={toggleMic}
            size="lg"
            className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 ${isMicMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"}`}
          >
            {isMicMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
          </Button>
          <Button
            onClick={toggleCamera}
            size="lg"
            className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 ${isCameraOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"}`}
          >
            {isCameraOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
          </Button>
          <Button
            onClick={switchCamera}
            size="lg"
            disabled={isCameraOff || isSwitchingCamera}
            className="rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
          >
            <SwitchCamera className={`h-5 w-5 sm:h-6 sm:w-6 ${isSwitchingCamera ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={toggleScreenShare}
            size="lg"
            className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 ${isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-600"}`}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />}
          </Button>
          <Button
            onClick={leaveRoom}
            size="lg"
            className="rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          {isMobile && (
            <Button
              onClick={() => setChatOpen(!chatOpen)}
              size="lg"
              className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 ${chatOpen ? "bg-blue-600" : "bg-gray-700"}`}
            >
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={!!enableDeviceDialog} onOpenChange={(open) => !open && setEnableDeviceDialog(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-md" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {enableDeviceDialog === "mic" && <Mic className="h-5 w-5" />}
              {enableDeviceDialog === "camera" && <Video className="h-5 w-5" />}
              {enableDeviceDialog === "mic" ? "Aktifkan mikrofon?" : "Aktifkan kamera?"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {enableDeviceDialog === "mic"
                ? "Aplikasi akan meminta izin akses mikrofon. Peserta lain dapat mendengar Anda."
                : "Aplikasi akan meminta izin akses kamera. Peserta lain dapat melihat Anda."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setEnableDeviceDialog(null)}>
              Batal
            </Button>
            <Button onClick={enableDeviceDialog === "mic" ? doEnableMic : doEnableCamera} className="bg-green-600 hover:bg-green-700">
              {enableDeviceDialog === "mic" ? "Aktifkan Mikrofon" : "Aktifkan Kamera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
