import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  update: "bg-[#E5E7EB] text-[#111827]",
  win: "bg-emerald-100 text-emerald-800",
  question: "bg-amber-100 text-amber-800",
  need: "bg-red-100 text-red-800",
  milestone: "bg-purple-100 text-purple-800",
};

const roleBadgeColors: Record<string, string> = {
  client: "bg-blue-100 text-blue-700",
  alumni: "bg-emerald-100 text-emerald-700",
  staff: "bg-orange-100 text-orange-700",
  admin: "bg-purple-100 text-purple-700",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PostCard({ post }: { post: PostType }) {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

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

  const leftBorderColor = post.postType === "need" ? "#FF6B6B" : post.postType === "question" ? "#F5A623" : "transparent";

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
            <span className="font-semibold text-sm text-[#111827]">{post.author.firstName}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeColors[post.author.role]}`}>
              {capitalize(post.author.role)}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${postTypeBadgeColors[post.postType]}`}>
              {capitalize(post.postType)}
            </span>
            {post.pinned && (
              <Pin className="w-3 h-3 text-[#0D9488]" />
            )}
          </div>
          <p className="text-sm text-[#111827] mt-1.5 leading-relaxed">{post.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-[#9CA3AF]">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-[#6B7280] flex items-center gap-1 transition-colors"
              data-testid={`button-reply-${post.id}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {post.replies.length > 0 ? `${post.replies.length} ${post.replies.length === 1 ? "Reply" : "Replies"}` : "Reply"}
            </button>
            {isStaffOrAdmin && (
              <button
                onClick={() => pinMutation.mutate()}
                className="text-xs text-[#6B7280] flex items-center gap-1"
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
                  <span className="font-semibold text-xs text-[#111827]">{reply.author.firstName}</span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-[#111827] mt-0.5 leading-relaxed">{reply.content}</p>
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
              className="bg-[#0D9488] text-white self-end"
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
