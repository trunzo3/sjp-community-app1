import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AvatarCircle } from "./avatar-circle";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

type Author = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarColor: string;
};

type ReplyType = {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
};

type ReactionData = {
  id: string;
  postId: string;
  userId: string;
  reactionType: string;
};

type PostType = {
  id: string;
  content: string;
  postType: string;
  pinned: boolean;
  createdAt: string;
  author: Author;
  replies: ReplyType[];
};

const postTypeBadgeColors: Record<string, string> = {
  update: "bg-[#C7C2BF] text-[#302D2E]",
  win: "bg-emerald-100 text-emerald-800",
  question: "bg-amber-100 text-amber-800",
  need: "bg-red-100 text-red-800",
  milestone: "bg-purple-100 text-purple-800",
};

const roleBadgeColors: Record<string, string> = {
  client: "bg-[#34737A] text-white",
  alumni: "bg-[#34737A] text-white",
  staff: "bg-[#34737A] text-white",
  admin: "bg-[#34737A] text-white",
};

const reactionEmojis: Record<string, string> = {
  heart: "❤️",
  clap: "👏",
  pray: "🙏",
  fire: "🔥",
  star: "⭐",
  smile: "😊",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PostCard({ post }: { post: PostType }) {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const queryClient = useQueryClient();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  const { data: postReactions } = useQuery<ReactionData[]>({
    queryKey: ["/api/reactions", post.id],
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/replies", { postId: post.id, content: replyText });
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/posts/${post.id}`, { pinned: !post.pinned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      await apiRequest("POST", "/api/reactions", { postId: post.id, reactionType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reactions", post.id] });
      setShowReactionPicker(false);
    },
  });

  const reactionCounts = (postReactions || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.reactionType] = (acc[r.reactionType] || 0) + 1;
    return acc;
  }, {});

  const userReaction = postReactions?.find(r => r.userId === user?.id);

  const leftBorderColor = post.postType === "need" ? "#D32027" : post.postType === "question" ? "#979DB6" : "transparent";

  return (
    <div
      className="bg-white rounded-xl p-4"
      style={{ borderLeft: leftBorderColor !== "transparent" ? `4px solid ${leftBorderColor}` : undefined, borderRadius: leftBorderColor !== "transparent" ? "4px 12px 12px 4px" : "12px" }}
      data-testid={`post-${post.id}`}
    >
      <div className="flex items-start gap-3">
        <AvatarCircle firstName={post.author.firstName} color={post.author.avatarColor} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[#302D2E]">{post.author.firstName}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeColors[post.author.role]}`}>
              {capitalize(post.author.role)}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${postTypeBadgeColors[post.postType]}`}>
              {capitalize(post.postType)}
            </span>
            {post.pinned && (
              <Pin className="w-3 h-3 text-[#34737A]" />
            )}
          </div>
          <p className="text-sm text-[#302D2E] mt-1.5 leading-relaxed">{post.content}</p>

          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap" data-testid={`reactions-display-${post.id}`}>
              {Object.entries(reactionCounts).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => reactMutation.mutate(type)}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                    userReaction?.reactionType === type
                      ? "bg-[#34737A]/10 border border-[#34737A]/30"
                      : "bg-[#F1EFEF] border border-transparent"
                  }`}
                  data-testid={`reaction-badge-${type}-${post.id}`}
                >
                  <span className="text-sm">{reactionEmojis[type]}</span>
                  <span className="text-[10px] font-medium text-[#868180]">{count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-[#C7C2BF]">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
            <div className="relative">
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="text-xs text-[#868180] flex items-center gap-1 transition-colors"
                data-testid={`button-react-${post.id}`}
              >
                <span className="text-sm">😊</span>
                React
              </button>
              {showReactionPicker && (
                <div
                  className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white rounded-xl shadow-lg border border-[#C7C2BF] p-1.5 z-10"
                  data-testid={`reaction-picker-${post.id}`}
                >
                  {Object.entries(reactionEmojis).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => reactMutation.mutate(type)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F1EFEF] transition-colors text-lg ${
                        userReaction?.reactionType === type ? "bg-[#34737A]/10" : ""
                      }`}
                      data-testid={`reaction-option-${type}-${post.id}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-[#868180] flex items-center gap-1 transition-colors"
              data-testid={`button-reply-${post.id}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {post.replies.length > 0 ? `${post.replies.length} ${post.replies.length === 1 ? "Reply" : "Replies"}` : "Reply"}
            </button>
            {isStaffOrAdmin && (
              <button
                onClick={() => pinMutation.mutate()}
                className="text-xs text-[#868180] flex items-center gap-1"
                data-testid={`button-pin-${post.id}`}
              >
                <Pin className="w-3.5 h-3.5" />
                {post.pinned ? "Unpin" : "Pin"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showReplies && (
        <div className="mt-3 ml-11 space-y-3">
          {post.replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2" data-testid={`reply-${reply.id}`}>
              <AvatarCircle firstName={reply.author.firstName} color={reply.author.avatarColor} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-[#302D2E]">{reply.author.firstName}</span>
                  <span className="text-[10px] text-[#C7C2BF]">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-[#302D2E] mt-0.5 leading-relaxed">{reply.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="text-xs min-h-[60px] resize-none flex-1"
              data-testid={`input-reply-${post.id}`}
            />
            <Button
              size="sm"
              onClick={() => replyMutation.mutate()}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="bg-[#34737A] text-white self-end"
              data-testid={`button-submit-reply-${post.id}`}
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
