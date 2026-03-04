import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Star, Briefcase, Heart, Home, TrendingUp } from "lucide-react";

export type MilestoneSelection = {
  milestoneType: string;
  milestoneCategory: string;
  note: string;
};

const milestoneCategories = [
  {
    name: "Recovery",
    color: "#C8882A",
    icon: Sparkles,
    milestones: [
      "24 hours sober",
      "7 days sober",
      "30 days sober",
      "60 days sober",
      "90 days sober",
      "6 months sober",
      "1 year sober",
      "Completed a recovery class",
      "Attended my first NA/AA meeting",
    ],
  },
  {
    name: "My Journey at Saint John's",
    color: "#34737A",
    icon: Star,
    milestones: [
      "First day at Saint John's",
      "One week in the program",
      "One month in the program",
      "Became a Dream Builder",
      "Became a Dream Achiever",
      "6 months in the program",
      "1 year in the program",
      "Graduation day",
    ],
  },
  {
    name: "Work and Career",
    color: "#5DA592",
    icon: Briefcase,
    milestones: [
      "Submitted my first job application",
      "Got a job interview",
      "Got the job",
      "First day at work",
      "30 days on the job",
      "90 days on the job",
      "Received a raise",
      "Got a promotion",
      "Completed job training",
    ],
  },
  {
    name: "Family",
    color: "#E8956D",
    icon: Heart,
    milestones: [
      "Reunited with my kids",
      "Completed parenting classes",
      "A great day with my family",
      "Custody milestone",
    ],
  },
  {
    name: "Housing",
    color: "#979DB6",
    icon: Home,
    milestones: [
      "Moved into stable housing",
      "First night in my own place",
    ],
  },
  {
    name: "Personal Growth",
    color: "#B8A832",
    icon: TrendingUp,
    milestones: [
      "Completed a class",
      "Tried something new",
      "Asked for help",
      "Set a boundary",
      "Had a hard day and got through it",
    ],
  },
];

type Props = {
  onSelect: (selection: MilestoneSelection) => void;
  selection: MilestoneSelection | null;
};

export function MilestonePicker({ onSelect, selection }: Props) {
  const [customText, setCustomText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [note, setNote] = useState(selection?.note || "");
  const isCustom = selection?.milestoneCategory === "Something else worth celebrating";

  const handleSelect = (milestone: string, category: string) => {
    setShowCustomInput(false);
    onSelect({ milestoneType: milestone, milestoneCategory: category, note });
  };

  const handleNoteChange = (newNote: string) => {
    setNote(newNote);
    if (selection) {
      onSelect({ ...selection, note: newNote });
    }
  };

  const handleCustomTileClick = () => {
    setShowCustomInput(true);
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      onSelect({ milestoneType: customText.trim(), milestoneCategory: "Something else worth celebrating", note });
    }
  };

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1" data-testid="milestone-picker">
      {milestoneCategories.map((cat) => {
        const Icon = cat.icon;
        return (
          <div key={cat.name}>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
              <span className="text-xs font-semibold text-[#302D2E]">{cat.name}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cat.milestones.map((m) => {
                const isSelected = selection?.milestoneType === m && selection?.milestoneCategory === cat.name;
                return (
                  <button
                    key={m}
                    onClick={() => handleSelect(m, cat.name)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      isSelected
                        ? "bg-[#34737A] text-white"
                        : "bg-[#F1EFEF] text-[#302D2E]"
                    }`}
                    data-testid={`milestone-tile-${m.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Star className="w-3.5 h-3.5 text-[#34737A]" />
          <span className="text-xs font-semibold text-[#302D2E]">Something else worth celebrating</span>
        </div>
        {isCustom ? (
          <button
            onClick={handleCustomTileClick}
            className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-[#34737A] text-white"
            data-testid="milestone-tile-custom-selected"
          >
            {selection?.milestoneType}
          </button>
        ) : !showCustomInput ? (
          <button
            onClick={handleCustomTileClick}
            className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-[#F1EFEF] text-[#302D2E]"
            data-testid="milestone-tile-something-else"
          >
            Something else worth celebrating
          </button>
        ) : null}
        {(showCustomInput || isCustom) && !isCustom && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Write your own milestone..."
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#C7C2BF] bg-white focus:outline-none focus:border-[#34737A]"
              data-testid="input-custom-milestone"
              onKeyDown={(e) => { if (e.key === "Enter") handleCustomSubmit(); }}
              autoFocus
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customText.trim()}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-[#34737A] text-white font-medium disabled:opacity-50"
              data-testid="button-custom-milestone-set"
            >
              Set
            </button>
          </div>
        )}
      </div>

      {selection && (
        <div className="pt-2 border-t border-[#F1EFEF]">
          <label className="text-xs font-medium text-[#868180] mb-1 block">Add a personal note (optional)</label>
          <Textarea
            value={note}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Say a few words about this moment..."
            className="min-h-[60px] resize-none text-sm border-[#C7C2BF]"
            data-testid="input-milestone-note"
          />
        </div>
      )}
    </div>
  );
}

export const MILESTONE_CATEGORY_STYLES: Record<string, { color: string; bg: string; icon: typeof Sparkles }> = {
  "Recovery": { color: "#C8882A", bg: "#FEF6EC", icon: Sparkles },
  "My Journey at Saint John's": { color: "#34737A", bg: "#EBF4F5", icon: Star },
  "Work and Career": { color: "#5DA592", bg: "#EDF7F4", icon: Briefcase },
  "Family": { color: "#E8956D", bg: "#FDF2EC", icon: Heart },
  "Housing": { color: "#979DB6", bg: "#F2F3F8", icon: Home },
  "Personal Growth": { color: "#B8A832", bg: "#FAFAEC", icon: TrendingUp },
  "Something else worth celebrating": { color: "#34737A", bg: "#EBF4F5", icon: Star },
};
