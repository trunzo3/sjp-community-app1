import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, ThumbsUp, Sparkles, Flame, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type ReactionData = {
  id: string;
  postId: string;
  userId: string;
  reactionType: string;
};

const reactionConfig: Record<string, { icon: typeof Heart; color: string; label: string }> = {
  heart: { icon: Heart, color: "#E8956D", label: "Heart" },
  clap: { icon: ThumbsUp, color: "#34737A", label: "Clap" },
  pray: { icon: Sparkles, color: "#979DB6", label: "Pray" },
  fire: { icon: Flame, color: "#C8882A", label: "Fire" },
  star: { icon: Star, color: "#B8A832", label: "Star" },
};

const REACTION_TYPES = ["heart", "clap", "pray", "fire", "star"];
const INACTIVE_COLOR = "#C7C2BF";

const burstAngles = [
  { x: 0, y: -1 },
  { x: 0.87, y: -0.5 },
  { x: -0.87, y: -0.5 },
  { x: 0.5, y: 0.87 },
];

function BurstDots({ color, active }: { color: string; active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {burstAngles.map((dir, i) => (
        <span
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: color,
            left: "50%",
            top: "50%",
            marginLeft: -2,
            marginTop: -2,
            animation: `burst-radial 300ms ease-out forwards`,
            ["--burst-x" as string]: `${dir.x * 14}px`,
            ["--burst-y" as string]: `${dir.y * 14}px`,
          }}
        />
      ))}
    </div>
  );
}

export function ReactionBar({
  postId,
  reactions,
  currentUserId,
  onReactionChange,
}: {
  postId: string;
  reactions: ReactionData[];
  currentUserId: string;
  onReactionChange?: () => void;
}) {
  const queryClient = useQueryClient();
  const [animatingAdd, setAnimatingAdd] = useState<string | null>(null);
  const [animatingRemove, setAnimatingRemove] = useState<string | null>(null);
  const [burstType, setBurstType] = useState<string | null>(null);
  const [countSlide, setCountSlide] = useState<Record<string, "up" | "down" | null>>({});
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  const reactMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      await apiRequest("POST", "/api/reactions", { postId, reactionType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reactions", postId] });
      onReactionChange?.();
    },
  });

  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.reactionType] = (acc[r.reactionType] || 0) + 1;
    return acc;
  }, {});

  const userReaction = reactions.find((r) => r.userId === currentUserId);

  function handleReaction(type: string) {
    if (reactMutation.isPending) return;

    const isRemoving = userReaction?.reactionType === type;

    if (isRemoving) {
      setAnimatingRemove(type);
      setCountSlide((prev) => ({ ...prev, [type]: "down" }));
      setTimeout(() => { setAnimatingRemove(null); setCountSlide((prev) => ({ ...prev, [type]: null })); }, 200);
    } else {
      if (userReaction) {
        setAnimatingRemove(userReaction.reactionType);
        setCountSlide((prev) => ({ ...prev, [userReaction.reactionType]: "down" }));
        setTimeout(() => { setAnimatingRemove(null); setCountSlide((prev) => ({ ...prev, [userReaction.reactionType]: null })); }, 200);
      }
      setAnimatingAdd(type);
      setBurstType(type);
      setCountSlide((prev) => ({ ...prev, [type]: "up" }));
      setTimeout(() => setAnimatingAdd(null), 200);
      setTimeout(() => setBurstType(null), 300);
      setTimeout(() => setCountSlide((prev) => ({ ...prev, [type]: null })), 200);
    }

    reactMutation.mutate(type);
  }

  return (
    <div className="flex items-center gap-1" data-testid={`reaction-bar-${postId}`}>
      {REACTION_TYPES.map((type) => {
        const config = reactionConfig[type];
        const Icon = config.icon;
        const count = reactionCounts[type] || 0;
        const isActive = userReaction?.reactionType === type;
        const isAdding = animatingAdd === type;
        const isRemovingAnim = animatingRemove === type;
        const showBurst = burstType === type;
        const slide = countSlide[type];

        let scale = 1;
        if (isAdding) scale = 1.3;
        if (isRemovingAnim) scale = 0.85;

        let countTransform = "translateY(0)";
        let countOpacity = 1;
        if (slide === "up") { countTransform = "translateY(-2px)"; countOpacity = 0.7; }
        if (slide === "down") { countTransform = "translateY(2px)"; countOpacity = 0.7; }

        return (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            className="relative flex items-center gap-0.5 rounded-full px-2 py-1.5 transition-colors"
            style={{
              minWidth: 44,
              minHeight: 44,
              justifyContent: "center",
              backgroundColor: isActive ? `${config.color}15` : "transparent",
            }}
            data-testid={`reaction-${type}-${postId}`}
          >
            <div
              className="relative"
              style={{
                transform: `scale(${scale})`,
                transition: "transform 200ms ease",
              }}
            >
              <Icon
                className="w-4 h-4 transition-colors"
                style={{ color: isActive ? config.color : INACTIVE_COLOR }}
                fill={isActive ? config.color : "none"}
                strokeWidth={2}
              />
              <BurstDots color={config.color} active={showBurst} />
            </div>
            {count > 0 && (
              <span
                className="text-[10px] font-medium ml-0.5 transition-all"
                style={{
                  color: isActive ? config.color : INACTIVE_COLOR,
                  transform: countTransform,
                  opacity: countOpacity,
                  transitionDuration: "200ms",
                }}
                data-testid={`reaction-count-${type}-${postId}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
