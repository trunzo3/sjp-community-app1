import { getDailyAffirmation, type Pillar } from "@/data/affirmations";
import { Users, Award, Leaf, Compass, Heart } from "lucide-react";
import { trackActivity } from "@/lib/activity";

const pillarConfig: Record<Pillar, { label: string; color: string; bg: string; icon: typeof Users }> = {
  community:  { label: "Community",  color: "#34737A", bg: "rgba(52, 115, 122, 0.08)",  icon: Users },
  confidence: { label: "Confidence", color: "#EEBBA7", bg: "rgba(238, 187, 167, 0.15)", icon: Award },
  resilience: { label: "Resilience", color: "#5DA592", bg: "rgba(93, 165, 146, 0.10)",  icon: Leaf },
  readiness:  { label: "Readiness",  color: "#979DB6", bg: "rgba(151, 157, 182, 0.12)", icon: Compass },
  wellness:   { label: "Wellness",   color: "#C8882A", bg: "rgba(200, 136, 42, 0.10)",  icon: Heart },
};

export function DailyAffirmation() {
  const affirmation = getDailyAffirmation();
  const config = pillarConfig[affirmation.pillar];
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl px-5 py-5 cursor-pointer"
      style={{ backgroundColor: config.bg }}
      onClick={() => trackActivity()}
      data-testid="daily-affirmation-card"
    >
      <p
        className="text-[15px] leading-relaxed font-serif italic"
        style={{ color: "#302D2E" }}
        data-testid="text-affirmation-quote"
      >
        &ldquo;{affirmation.quote}&rdquo;
      </p>
      {affirmation.attribution && (
        <p className="text-xs mt-2" style={{ color: "#868180" }} data-testid="text-affirmation-attribution">
          — {affirmation.attribution}
        </p>
      )}
      <div className="flex items-center gap-1.5 mt-3" data-testid="text-affirmation-pillar">
        <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
        <span className="text-xs font-medium" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
