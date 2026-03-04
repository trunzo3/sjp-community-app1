import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Check, Users, Star, Shield, Briefcase, Heart } from "lucide-react";

type ProgressEntry = {
  id: string;
  userId: string;
  pillar: string;
  progress: number;
};

const pillarConfig = [
  { key: "community", label: "Community", color: "#34737A", icon: Users },
  { key: "confidence", label: "Confidence", color: "#979DB6", icon: Star },
  { key: "resilience", label: "Resilience", color: "#D32027", icon: Shield },
  { key: "readiness", label: "Readiness", color: "#5DA592", icon: Briefcase },
  { key: "wellness", label: "Wellness", color: "#EEBBA7", icon: Heart },
];

function ProgressRing({ size, strokeWidth, progress, color, children }: {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F1EFEF"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export function MyJourney() {
  const { user } = useAuth();

  const { data: progressData } = useQuery<ProgressEntry[]>({
    queryKey: ["/api/progress", user?.id || ""],
    enabled: !!user?.id,
  });

  if (!user || user.role === "staff" || user.role === "admin") return null;

  const progressMap: Record<string, number> = {};
  for (const entry of progressData || []) {
    progressMap[entry.pillar] = entry.progress;
  }

  const pillarValues = pillarConfig.map(p => progressMap[p.key] ?? 0);
  const overall = pillarValues.length > 0
    ? Math.round(pillarValues.reduce((a, b) => a + b, 0) / pillarValues.length)
    : 0;
  const isComplete = overall === 100;

  return (
    <div className="bg-white rounded-xl p-4" data-testid="my-journey-card">
      <div className="flex items-center gap-4 mb-4">
        <ProgressRing size={80} strokeWidth={6} progress={overall} color="#34737A">
          <span className="text-lg font-bold text-[#302D2E]" data-testid="text-overall-progress">{overall}%</span>
        </ProgressRing>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-[#302D2E]" data-testid="text-journey-title">My Journey</h2>
          <p className="text-xs text-[#868180]">Five Foundations for Real Change</p>
          {isComplete ? (
            <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1" data-testid="text-journey-complete">
              <Check className="w-3 h-3" /> All foundations complete
            </p>
          ) : (
            <p className="text-xs text-[#868180] mt-0.5" data-testid="text-journey-encouragement">Keep going — every step matters</p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        {pillarConfig.map((pillar) => {
          const value = progressMap[pillar.key] ?? 0;
          return (
            <div key={pillar.key} className="flex flex-col items-center gap-1" data-testid={`pillar-${pillar.key}`}>
              <ProgressRing size={52} strokeWidth={4} progress={value} color={pillar.color}>
                <pillar.icon className="w-[18px] h-[18px]" style={{ color: pillar.color }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </ProgressRing>
              <span className="text-[10px] font-semibold" style={{ color: pillar.color }}>
                {pillar.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
