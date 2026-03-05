import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Check, Route, Briefcase, Home, DollarSign, Heart, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProgressEntry = {
  id: string;
  userId: string;
  category: string;
  progress: number;
};

const categoryConfig = [
  { key: "journey", label: "Journey", color: "#34737A", icon: Route, max: 104 },
  { key: "employment", label: "Employment", color: "#5DA592", icon: Briefcase, max: 11 },
  { key: "housing", label: "Housing", color: "#D32027", icon: Home, max: 8 },
  { key: "finance", label: "Finance", color: "#979DB6", icon: DollarSign, max: 8 },
  { key: "parenting", label: "Parenting", color: "#EEBBA7", icon: Heart, max: 12 },
  { key: "community", label: "Community", color: "#B8876F", icon: Users, max: 4 },
];

const TOTAL_POSSIBLE = categoryConfig.reduce((sum, c) => sum + c.max, 0);

function ProgressRing({ size, strokeWidth, progress, color, children }: {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1EFEF" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function MyJourney() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const { data: progressData } = useQuery<ProgressEntry[]>({
    queryKey: ["/api/progress", user?.id || ""],
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [category, progress] of Object.entries(editValues)) {
        await apiRequest("PUT", "/api/progress/self", { category, progress });
      }
    },
    onSuccess: () => {
      setEditing(false);
      setEditValues({});
      queryClient.invalidateQueries({ queryKey: ["/api/progress", user?.id || ""] });
    },
  });

  if (!user || user.role === "staff" || user.role === "admin") return null;

  const progressMap: Record<string, number> = {};
  for (const entry of progressData || []) {
    progressMap[entry.category] = entry.progress;
  }

  const totalCompleted = categoryConfig.reduce((sum, c) => sum + (progressMap[c.key] ?? 0), 0);
  const overall = Math.round((totalCompleted / TOTAL_POSSIBLE) * 100);
  const isComplete = overall === 100;

  function getEditValue(key: string): number {
    if (editValues[key] !== undefined) return editValues[key];
    return progressMap[key] ?? 0;
  }

  function openEdit() {
    const initial: Record<string, number> = {};
    for (const c of categoryConfig) {
      initial[c.key] = progressMap[c.key] ?? 0;
    }
    setEditValues(initial);
    setEditing(true);
  }

  if (editing && user.role === "client") {
    return (
      <div className="bg-white rounded-xl p-4" data-testid="my-journey-edit">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-[#302D2E]">Edit My Journey</h2>
          <button onClick={() => { setEditing(false); setEditValues({}); }} className="p-1 rounded-lg hover:bg-[#F1EFEF]" data-testid="button-cancel-edit-journey">
            <X className="w-4 h-4 text-[#868180]" />
          </button>
        </div>
        <div className="space-y-3">
          {categoryConfig.map((cat) => {
            const val = getEditValue(cat.key);
            const Icon = cat.icon;
            return (
              <div key={cat.key} className="space-y-1" data-testid={`edit-category-${cat.key}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: cat.color }} />
                    <span className="text-xs font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                  </div>
                  <span className="text-xs text-[#868180]" data-testid={`text-progress-${cat.key}`}>{val} / {cat.max}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={cat.max}
                  value={val}
                  onChange={(e) => setEditValues({ ...editValues, [cat.key]: parseInt(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: cat.color }}
                  data-testid={`slider-${cat.key}`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" className="bg-[#34737A] text-white flex-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-journey">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(false); setEditValues({}); }} data-testid="button-cancel-journey">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl p-4 cursor-pointer"
      onClick={user.role === "client" ? openEdit : undefined}
      data-testid="my-journey-card"
    >
      <div className="flex items-center gap-4 mb-4">
        <ProgressRing size={80} strokeWidth={6} progress={overall} color="#34737A">
          <span className="text-lg font-bold text-[#302D2E]" data-testid="text-overall-progress">{overall}%</span>
        </ProgressRing>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-[#302D2E]" data-testid="text-journey-title">My Journey</h2>
          <p className="text-xs text-[#868180]">Six Categories for Real Change</p>
          {isComplete ? (
            <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1" data-testid="text-journey-complete">
              <Check className="w-3 h-3" /> All categories complete
            </p>
          ) : (
            <p className="text-xs text-[#868180] mt-0.5" data-testid="text-journey-encouragement">
              {user.role === "client" ? "Tap to update your progress" : "Keep going — every step matters"}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        {categoryConfig.map((cat) => {
          const value = progressMap[cat.key] ?? 0;
          const pct = Math.round((value / cat.max) * 100);
          return (
            <div key={cat.key} className="flex flex-col items-center gap-1" data-testid={`category-${cat.key}`}>
              <ProgressRing size={44} strokeWidth={3.5} progress={pct} color={cat.color}>
                <cat.icon className="w-[14px] h-[14px]" style={{ color: cat.color }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </ProgressRing>
              <span className="text-[9px] font-semibold" style={{ color: cat.color }}>
                {cat.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
