import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PostCard } from "./post-card";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const postTypes = ["update", "win", "question", "need", "milestone"] as const;
const filterOptions = ["all", "need", "win", "milestone", "question"] as const;
const filterLabels: Record<string, string> = {
  all: "All",
  need: "Needs",
  win: "Wins",
  milestone: "Milestones",
  question: "Questions",
};

export function CommunityFeed({ showPrivacyBanner = false }: { showPrivacyBanner?: boolean }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<typeof postTypes[number]>("update");
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/posts", `?filter=${filter}`],
  });

  const createPost = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/posts", { content, postType });
    },
    onSuccess: () => {
      setContent("");
      setPostType("update");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  return (
    <div className="space-y-4">
      {showPrivacyBanner && (
        <div className="bg-[#F0FDFA] rounded-xl px-4 py-3 flex items-center gap-2" data-testid="privacy-banner">
          <svg className="w-4 h-4 text-[#0D9488] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-[#0D9488] font-medium">
            Private space for the SJP community. What's shared here stays here.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 space-y-3" data-testid="post-composer">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share something with the community..."
          className="min-h-[80px] resize-none text-sm border-[#E5E7EB]"
          data-testid="input-post-content"
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {postTypes.map((pt) => (
              <button
                key={pt}
                onClick={() => setPostType(pt)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  postType === pt
                    ? "bg-[#0D9488] text-white"
                    : "bg-[#F3F4F6] text-[#6B7280]"
                }`}
                data-testid={`button-type-${pt}`}
              >
                {pt.charAt(0).toUpperCase() + pt.slice(1)}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => createPost.mutate()}
            disabled={!content.trim() || createPost.isPending}
            className="bg-[#0D9488] text-white"
            data-testid="button-share-post"
          >
            {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share"}
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1" data-testid="feed-filters">
        {filterOptions.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-[#0D9488] text-white"
                : "bg-white text-[#6B7280]"
            }`}
            data-testid={`button-filter-${f}`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
        </div>
      ) : (
        <div className="space-y-3">
          {posts?.map((post: any) => (
            <PostCard key={post.id} post={post} />
          ))}
          {posts?.length === 0 && (
            <div className="text-center py-8 text-sm text-[#9CA3AF]">No posts yet. Be the first to share!</div>
          )}
        </div>
      )}
    </div>
  );
}
