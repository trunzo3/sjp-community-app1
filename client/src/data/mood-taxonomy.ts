export interface OuterEmotion {
  label: string;
  color: string;
}

export interface MidEmotion {
  label: string;
  color: string;
  outer: OuterEmotion[];
}

export interface CoreEmotion {
  label: string;
  color: string;
  mid: MidEmotion[];
}

export const MOOD_TAXONOMY: CoreEmotion[] = [
  {
    label: "Peaceful",
    color: "#3B82F6",
    mid: [
      {
        label: "Calm",
        color: "#60A5FA",
        outer: [
          { label: "Centered", color: "#93C5FD" },
          { label: "Still", color: "#7DB8FC" },
          { label: "Grounded", color: "#BFDBFE" },
          { label: "At Ease", color: "#A8CFFB" },
        ],
      },
      {
        label: "Content",
        color: "#3B82F6",
        outer: [
          { label: "Satisfied", color: "#5B9BF7" },
          { label: "Grateful", color: "#2563EB" },
          { label: "Comfortable", color: "#4A90F5" },
          { label: "Settled", color: "#6BA6F8" },
        ],
      },
      {
        label: "Relieved",
        color: "#2563EB",
        outer: [
          { label: "Lighter", color: "#3A7AED" },
          { label: "Free", color: "#1D4ED8" },
          { label: "Unburdened", color: "#4B85EE" },
          { label: "Breathing", color: "#2D6CE5" },
        ],
      },
      {
        label: "Resting",
        color: "#1E40AF",
        outer: [
          { label: "Quiet", color: "#2850BF" },
          { label: "Gentle", color: "#1E3A9E" },
          { label: "Soft", color: "#3560CF" },
          { label: "Slow", color: "#1A3494" },
        ],
      },
    ],
  },
  {
    label: "Hopeful",
    color: "#FACC15",
    mid: [
      {
        label: "Optimistic",
        color: "#FDE047",
        outer: [
          { label: "Looking Forward", color: "#FEF08A" },
          { label: "Believing", color: "#FDE86B" },
          { label: "Trusting", color: "#FEF3A2" },
          { label: "Open", color: "#FDE55A" },
        ],
      },
      {
        label: "Excited",
        color: "#FACC15",
        outer: [
          { label: "Energized", color: "#FBD53E" },
          { label: "Eager", color: "#F9C20A" },
          { label: "Alive", color: "#FBDA52" },
          { label: "Buzzing", color: "#F5B800" },
        ],
      },
      {
        label: "Proud",
        color: "#EAB308",
        outer: [
          { label: "Accomplished", color: "#F0C030" },
          { label: "Worthy", color: "#D4A006" },
          { label: "Capable", color: "#E8B820" },
          { label: "Showing Up", color: "#C89500" },
        ],
      },
      {
        label: "Joyful",
        color: "#F59E0B",
        outer: [
          { label: "Happy", color: "#FBBF24" },
          { label: "Light", color: "#F8B018" },
          { label: "Laughing", color: "#FBC94D" },
          { label: "Warm", color: "#F09000" },
        ],
      },
    ],
  },
  {
    label: "Heavy",
    color: "#8B5CF6",
    mid: [
      {
        label: "Sad",
        color: "#A78BFA",
        outer: [
          { label: "Hurting", color: "#C4B5FD" },
          { label: "Tearful", color: "#B8A4FC" },
          { label: "Missing Someone", color: "#D4CAFE" },
          { label: "Lonely", color: "#AD95FB" },
        ],
      },
      {
        label: "Overwhelmed",
        color: "#8B5CF6",
        outer: [
          { label: "Drowning", color: "#9B72F7" },
          { label: "Too Much", color: "#7C3AED" },
          { label: "Shut Down", color: "#A580F8" },
          { label: "Foggy", color: "#8E62F5" },
        ],
      },
      {
        label: "Ashamed",
        color: "#7C3AED",
        outer: [
          { label: "Embarrassed", color: "#8950EF" },
          { label: "Not Enough", color: "#6D28D9" },
          { label: "Exposed", color: "#9462F0" },
          { label: "Small", color: "#7438E0" },
        ],
      },
      {
        label: "Numb",
        color: "#6D28D9",
        outer: [
          { label: "Empty", color: "#7934E2" },
          { label: "Flat", color: "#5B21B6" },
          { label: "Disconnected", color: "#8040E8" },
          { label: "Going Through Motions", color: "#6425CC" },
        ],
      },
    ],
  },
  {
    label: "Restless",
    color: "#EF4444",
    mid: [
      {
        label: "Anxious",
        color: "#F87171",
        outer: [
          { label: "Racing", color: "#FCA5A5" },
          { label: "Tight", color: "#F98B8B" },
          { label: "On Edge", color: "#FBB5B5" },
          { label: "Can't Sit Still", color: "#F89898" },
        ],
      },
      {
        label: "Frustrated",
        color: "#EF4444",
        outer: [
          { label: "Stuck", color: "#F26060" },
          { label: "Blocked", color: "#E83A3A" },
          { label: "Impatient", color: "#F47070" },
          { label: "Annoyed", color: "#F05050" },
        ],
      },
      {
        label: "Angry",
        color: "#DC2626",
        outer: [
          { label: "Burning", color: "#E53E3E" },
          { label: "Bitter", color: "#C81E1E" },
          { label: "Fed Up", color: "#D33030" },
          { label: "Guarded", color: "#B91C1C" },
        ],
      },
      {
        label: "Scared",
        color: "#B91C1C",
        outer: [
          { label: "Afraid", color: "#C72828" },
          { label: "Unsafe", color: "#A31818" },
          { label: "Panicked", color: "#D03232" },
          { label: "Threatened", color: "#991B1B" },
        ],
      },
    ],
  },
  {
    label: "Strong",
    color: "#22C55E",
    mid: [
      {
        label: "Determined",
        color: "#4ADE80",
        outer: [
          { label: "Focused", color: "#86EFAC" },
          { label: "Driven", color: "#6EE7A0" },
          { label: "Committed", color: "#A2F4BE" },
          { label: "Ready", color: "#5AE390" },
        ],
      },
      {
        label: "Brave",
        color: "#22C55E",
        outer: [
          { label: "Courageous", color: "#38D06E" },
          { label: "Standing Tall", color: "#16A34A" },
          { label: "Facing It", color: "#45D87A" },
          { label: "Speaking Up", color: "#2ABC60" },
        ],
      },
      {
        label: "Resilient",
        color: "#16A34A",
        outer: [
          { label: "Bouncing Back", color: "#22B358" },
          { label: "Getting Through", color: "#0E8A3C" },
          { label: "Still Here", color: "#2DBE62" },
          { label: "Surviving", color: "#159244" },
        ],
      },
      {
        label: "Connected",
        color: "#15803D",
        outer: [
          { label: "Supported", color: "#1A9048" },
          { label: "Belonging", color: "#0F6B30" },
          { label: "Seen", color: "#209A50" },
          { label: "Held", color: "#126228" },
        ],
      },
    ],
  },
];

export function textOnColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? "#302D2E" : "#FFFFFF";
}
