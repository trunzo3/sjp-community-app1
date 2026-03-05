import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { trackActivity } from "@/lib/activity";
import { AvatarCircle } from "@/components/avatar-circle";
import { PostCard } from "@/components/post-card";
import { MoodCheckinFlow } from "@/components/mood-checkin-flow";
import { MyColors } from "@/components/my-colors";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, LogOut, BookOpen, Shield, FileText, Loader2, Check, X, Camera, Palette, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { processAvatarImage } from "@/lib/image-utils";
import { textOnColor } from "@/data/mood-taxonomy";
import type { MoodCheckin } from "@shared/schema";

const roleBadgeColors: Record<string, string> = {
  client: "bg-[#34737A] text-white",
  alumni: "bg-[#34737A] text-white",
  staff: "bg-[#34737A] text-white",
  admin: "bg-[#34737A] text-white",
};

export default function ProfilePage() {
  const { user, logout, refetchUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState(user?.bio || "");
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [showCheckinFlow, setShowCheckinFlow] = useState(false);
  const [showMyColors, setShowMyColors] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const myColorsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { trackActivity(); }, []);

  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";
  const isAlumni = user?.role === "alumni";
  const isClientOrAlumni = user?.role === "client" || user?.role === "alumni";

  const { data: todayCheckin, isLoading: checkinLoading } = useQuery<MoodCheckin | null>({
    queryKey: ["/api/mood/today"],
  });

  const { data: myPosts, isLoading: postsLoading } = useQuery<any[]>({
    queryKey: ["/api/posts/user", user?.id || ""],
    enabled: showMyPosts && !!user?.id,
  });

  const { data: pendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/stories/pending-count"],
    enabled: isStaffOrAdmin,
  });

  const updateBio = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/users/${user?.id}`, { bio });
    },
    onSuccess: () => {
      setEditingBio(false);
      refetchUser();
      toast({ title: "Bio updated" });
    },
  });

  const uploadPhoto = useMutation({
    mutationFn: async (blob: Blob) => {
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.jpg");
      const res = await fetch(`/api/users/${user?.id}/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setPhotoPreview(null);
      setPhotoBlob(null);
      setPhotoError("");
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Photo updated" });
    },
    onError: () => {
      setPhotoError("Something went wrong. Please try again.");
    },
  });

  const removePhoto = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/users/${user?.id}`, { photoUrl: null });
    },
    onSuccess: () => {
      setConfirmingRemove(false);
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Photo removed" });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file.");
      return;
    }
    setPhotoError("");
    setProcessingPhoto(true);
    try {
      const blob = await processAvatarImage(file);
      setPhotoBlob(blob);
      const url = URL.createObjectURL(blob);
      setPhotoPreview(url);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to process image.");
    } finally {
      setProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSavePhoto = () => {
    if (!photoBlob) return;
    uploadPhoto.mutate(photoBlob);
  };

  const handleCancelPreview = () => {
    setPhotoPreview(null);
    setPhotoBlob(null);
    setPhotoError("");
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleCheckinComplete = (checkin: MoodCheckin) => {
    setShowCheckinFlow(false);
    setShowMyColors(true);
    setTimeout(() => {
      myColorsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (!user) return null;

  if (showCheckinFlow) {
    return (
      <div className="max-w-[600px] md:mx-0">
        <MoodCheckinFlow
          onComplete={handleCheckinComplete}
          onClose={() => setShowCheckinFlow(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[600px] md:mx-0">
      <div className="h-[3px] bg-[#EEBBA7] -mx-4 md:mx-0 md:rounded-full mb-4" />

      <div className="bg-[#FCF3EE] rounded-xl p-5 mb-4" data-testid="profile-header">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            {isStaffOrAdmin ? (
              <button
                onClick={() => !processingPhoto && !uploadPhoto.isPending && fileInputRef.current?.click()}
                className="relative group"
                data-testid="button-avatar-tap"
                type="button"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover"
                    data-testid="img-photo-preview"
                  />
                ) : processingPhoto ? (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[#34737A]" />
                  </div>
                ) : (
                  <AvatarCircle firstName={user.firstName} color={user.avatarColor} size="lg" photoUrl={user.photoUrl} />
                )}
                {!processingPhoto && !uploadPhoto.isPending && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#34737A] flex items-center justify-center border-2 border-white" data-testid="icon-camera-overlay">
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ) : (
              <AvatarCircle firstName={user.firstName} color={user.avatarColor} size="lg" photoUrl={user.photoUrl} />
            )}
            {isStaffOrAdmin && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-file-photo"
              />
            )}
            {isStaffOrAdmin && !photoPreview && (
              <span className="text-[10px] text-[#34737A] font-medium mt-1" data-testid="text-photo-action">
                {user.photoUrl ? "Change photo" : "Add a photo"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#302D2E]" data-testid="text-profile-name">{user.firstName}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColors[user.role]}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
            {editingBio ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                  data-testid="input-bio"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="bg-[#34737A] text-white" onClick={() => updateBio.mutate()} disabled={updateBio.isPending} data-testid="button-save-bio">
                    <Check className="w-3 h-3 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingBio(false); setBio(user.bio || ""); }} data-testid="button-cancel-bio">
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {user.bio && <p className="text-sm text-[#868180] mt-1">{user.bio}</p>}
                <button onClick={() => setEditingBio(true)} className="mt-1 flex items-center gap-1 text-xs text-[#34737A] font-medium" data-testid="button-edit-bio">
                  <Pencil className="w-3 h-3" /> {user.bio ? "Edit bio" : "Add a bio"}
                </button>
              </>
            )}
            <div className="mt-3 space-y-1 text-xs text-[#C7C2BF]">
              <p data-testid="text-graduation-date">
                Graduation: {user.graduationDate ? format(new Date(user.graduationDate + "T00:00:00"), "MMMM d, yyyy") : "TBD"}
              </p>
              <p data-testid="text-member-since">
                Member since {user.createdAt ? format(new Date(user.createdAt), "MMMM yyyy") : ""}
              </p>
            </div>
          </div>
        </div>

        {isStaffOrAdmin && (photoPreview || photoError) && (
          <div className="mt-4 pt-3 border-t border-[#C7C2BF] space-y-2" data-testid="photo-edit-section">
            {photoError && (
              <p className="text-xs text-[#D32027]" data-testid="text-photo-error">{photoError}</p>
            )}
            {photoPreview && (
              <div className="flex gap-2">
                <Button size="sm" className="bg-[#34737A] text-white" onClick={handleSavePhoto} disabled={uploadPhoto.isPending} data-testid="button-save-photo">
                  {uploadPhoto.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Save photo
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelPreview} disabled={uploadPhoto.isPending} data-testid="button-cancel-photo">
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {isStaffOrAdmin && user.photoUrl && !photoPreview && (
          <div className="mt-3 pt-2" data-testid="remove-photo-section">
            {confirmingRemove ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#302D2E]">Remove your photo?</span>
                <button
                  onClick={() => removePhoto.mutate()}
                  className="text-xs text-[#D32027] font-medium"
                  disabled={removePhoto.isPending}
                  data-testid="button-confirm-remove-photo"
                >
                  {removePhoto.isPending ? "Removing..." : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmingRemove(false)}
                  className="text-xs text-[#868180] font-medium"
                  data-testid="button-cancel-remove-photo"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingRemove(true)}
                className="text-xs text-[#D32027] font-medium"
                data-testid="button-remove-photo"
              >
                Remove photo
              </button>
            )}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[#C7C2BF]">
          <p className="text-[10px] text-[#C7C2BF] italic">Your profile is visible only to the SJP community.</p>
        </div>
      </div>

      <div className="mb-4" data-testid="mood-checkin-section">
        {checkinLoading ? (
          <div className="bg-white rounded-xl p-4 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#34737A]" />
          </div>
        ) : todayCheckin ? (
          <div className="bg-white rounded-xl p-4" data-testid="mood-today-summary">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#302D2E]">Today's Check-In</h3>
              <button
                onClick={() => setShowMyColors(!showMyColors)}
                className="text-xs text-[#34737A] font-medium flex items-center gap-1"
                data-testid="button-my-colors-link"
              >
                <Palette className="w-3 h-3" /> My Colors
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: todayCheckin.outerColor }}
              >
                <span className="text-lg" style={{ color: textOnColor(todayCheckin.outerColor) }}>
                  {todayCheckin.outerLabel.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: todayCheckin.outerColor }}>
                  {todayCheckin.outerLabel}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[todayCheckin.coreColor, todayCheckin.midColor, todayCheckin.outerColor].map((c, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowCheckinFlow(true)}
                className="text-xs text-[#868180] font-medium px-3 py-1.5 rounded-lg border border-[#E5E1DE]"
                data-testid="button-update-checkin"
              >
                Update
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCheckinFlow(true)}
            className="w-full bg-white rounded-xl p-5 text-left shadow-sm hover:shadow-md transition-shadow"
            data-testid="button-start-checkin"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                {["#3B82F6", "#FACC15", "#8B5CF6", "#EF4444", "#22C55E"].map((c) => (
                  <div key={c} className="w-6 h-6 rounded-full border-2 border-white" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#302D2E]">Check in today</p>
                <p className="text-xs text-[#868180]">How are you feeling right now?</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {showMyColors && (
        <div ref={myColorsRef} className="mb-4">
          <MyColors />
        </div>
      )}

      <div className="space-y-2 mb-4">
        <button
          className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left"
          onClick={() => setShowMyPosts(!showMyPosts)}
          data-testid="button-my-posts"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#302D2E]">My Posts</p>
            <p className="text-xs text-[#868180]">See your community posts</p>
          </div>
        </button>

        {showMyPosts && (
          <div className="space-y-3 px-1">
            {postsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#34737A]" /></div>
            ) : (
              <>
                {myPosts?.map((post: any) => <PostCard key={post.id} post={post} />)}
                {myPosts?.length === 0 && <p className="text-center text-sm text-[#C7C2BF] py-4">No posts yet.</p>}
              </>
            )}
          </div>
        )}

        {isClientOrAlumni && (
          <button
            className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left"
            onClick={() => navigate("/my-plan")}
            data-testid="button-my-plan"
          >
            <div className="w-9 h-9 rounded-lg bg-[#EEBBA7]/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#EEBBA7]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#302D2E]">My Plan</p>
              <p className="text-xs text-[#868180]">Your private safety plan</p>
            </div>
          </button>
        )}

        {isAlumni && (
          <button
            className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left"
            onClick={() => navigate("/share-story")}
            data-testid="button-share-story"
          >
            <div className="w-9 h-9 rounded-lg bg-[#34737A]/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#34737A]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#302D2E]">Share Your Story</p>
              <p className="text-xs text-[#868180]">Your journey can inspire someone</p>
            </div>
          </button>
        )}

        {isStaffOrAdmin && (
          <button
            className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left"
            onClick={() => navigate("/admin")}
            data-testid="button-admin-panel"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#302D2E]">Admin Panel</p>
              <p className="text-xs text-[#868180]">Manage stories, users & content</p>
            </div>
            {pendingCount && pendingCount.count > 0 && (
              <div className="w-5 h-5 rounded-full bg-[#D32027] flex items-center justify-center" data-testid="badge-pending-count">
                <span className="text-[10px] font-bold text-white">{pendingCount.count}</span>
              </div>
            )}
          </button>
        )}

        <button
          className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left"
          onClick={handleLogout}
          data-testid="button-sign-out"
        >
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-[#302D2E]">Sign Out</p>
        </button>
      </div>
    </div>
  );
}
