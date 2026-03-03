import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { AvatarCircle } from "@/components/avatar-circle";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, LogOut, BookOpen, Shield, FileText, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";

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

  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";
  const isAlumni = user?.role === "alumni";

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

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return null;

  return (
    <div>
      <div className="h-[3px] bg-[#EEBBA7] -mx-4 mb-4" />
      <div className="bg-[#FCF3EE] rounded-xl p-5 mb-4" data-testid="profile-header">
        <div className="flex items-start gap-4">
          <AvatarCircle firstName={user.firstName} color={user.avatarColor} size="lg" />
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
        <div className="mt-3 pt-3 border-t border-[#C7C2BF]">
          <p className="text-[10px] text-[#C7C2BF] italic">Your profile is visible only to the SJP community.</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
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
              <Shield className="w-4 h-4 text-purple-600" />
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

      {showMyPosts && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#302D2E]">Your Posts</h2>
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
    </div>
  );
}
