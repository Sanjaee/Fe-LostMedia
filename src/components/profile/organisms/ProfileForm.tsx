import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Profile, CreateProfileRequest, UpdateProfileRequest } from "@/types/profile";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";

interface ProfileFormProps {
  profile?: Profile;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  showDialog?: boolean; // If false, render as inline form instead of dialog
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  isOpen = true,
  onClose,
  onSuccess,
  showDialog = true,
}) => {
  const { api } = useApi();
  const { toast } = useToast();
  const { data: session, update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [formData, setFormData] = useState<CreateProfileRequest | UpdateProfileRequest>({
    bio: "",
    cover_photo: "",
    website: "",
    location: "",
    city: "",
    country: "",
    hometown: "",
    education: "",
    work: "",
    relationship_status: "",
    intro: "",
    is_profile_public: true,
  });

  useEffect(() => {
    if (session?.user?.name !== undefined) {
      setName(session.user.name || "");
    }
  }, [session?.user?.name, isOpen]);

  useEffect(() => {
    if (profile) {
      setFormData({
        bio: profile.bio || "",
        cover_photo: profile.cover_photo || "",
        website: profile.website || "",
        location: profile.location || "",
        city: profile.city || "",
        country: profile.country || "",
        hometown: profile.hometown || "",
        education: profile.education || "",
        work: profile.work || "",
        relationship_status: profile.relationship_status || "",
        intro: profile.intro || "",
        is_profile_public: profile.is_profile_public,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const nameTrimmed = name.trim();
      if (profile && nameTrimmed && nameTrimmed !== (session?.user?.name || "")) {
        await api.updateMe({ full_name: nameTrimmed });
        await updateSession();
      }
      if (profile) {
        await api.updateProfile(profile.id, formData);
        toast({
          title: "Berhasil",
          description: "Profil berhasil diperbarui",
        });
      } else {
        await api.createProfile(formData);
        toast({
          title: "Berhasil",
          description: "Profil berhasil dibuat",
        });
      }
      onSuccess();
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama - dari session */}
          <div>
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Anda"
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio || ""}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          {/* Intro */}
          <div>
            <Label htmlFor="intro">Intro</Label>
            <Textarea
              id="intro"
              value={formData.intro || ""}
              onChange={(e) => handleChange("intro", e.target.value)}
              placeholder="Write a short introduction..."
              rows={2}
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Your location"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city || ""}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Your city"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country || ""}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="Your country"
              />
            </div>
            <div>
              <Label htmlFor="hometown">Hometown</Label>
              <Input
                id="hometown"
                value={formData.hometown || ""}
                onChange={(e) => handleChange("hometown", e.target.value)}
                placeholder="Your hometown"
              />
            </div>
          </div>

          {/* Work & Education */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="work">Work</Label>
              <Input
                id="work"
                value={formData.work || ""}
                onChange={(e) => handleChange("work", e.target.value)}
                placeholder="Your work"
              />
            </div>
            <div>
              <Label htmlFor="education">Education</Label>
              <Input
                id="education"
                value={formData.education || ""}
                onChange={(e) => handleChange("education", e.target.value)}
                placeholder="Your education"
              />
            </div>
          </div>

          {/* Relationship Status */}
          <div>
            <Label htmlFor="relationship_status">Relationship Status</Label>
            <Input
              id="relationship_status"
              value={formData.relationship_status || ""}
              onChange={(e) => handleChange("relationship_status", e.target.value)}
              placeholder="e.g., Single, Married, etc."
            />
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website || ""}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Cover Photo URL */}
          <div>
            <Label htmlFor="cover_photo">Cover Photo URL</Label>
            <Input
              id="cover_photo"
              type="url"
              value={formData.cover_photo || ""}
              onChange={(e) => handleChange("cover_photo", e.target.value)}
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="is_profile_public">Public Profile</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Allow others to view your profile
              </p>
            </div>
            <Switch
              id="is_profile_public"
              checked={formData.is_profile_public ?? true}
              onCheckedChange={(checked) => handleChange("is_profile_public", checked)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : profile ? "Update" : "Create"}
            </Button>
          </div>
        </form>
  );

  if (showDialog) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose || (() => {})}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{profile ? "Edit Profile" : "Create Profile"}</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {profile ? "Edit Profile" : "Create Profile"}
      </h2>
      {formContent}
    </div>
  );
};
