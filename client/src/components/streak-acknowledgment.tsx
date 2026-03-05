import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { X } from "lucide-react";

// CONTENT PENDING SJP REVIEW
const milestoneCopy: Record<number, string> = {
  3: "You have shown up three days in a row. That matters.",
  7: "One week of showing up for yourself. Keep going.",
  14: "Two weeks. You keep coming back, and that is something.",
  30: "Thirty days. You have built something real.",
  60: "Two months of showing up. You are building a habit that belongs to you.",
  90: "Ninety days. That is the same courage it takes to hit any milestone. You did this.",
  180: "Six months of coming back. This community is lucky to have you in it.",
  365: "One year. You showed up for yourself three hundred and sixty-five times. That is extraordinary.",
};

export function StreakAcknowledgment() {
  const queryClient = useQueryClient();

  const { data: ack } = useQuery<{
    id: string;
    streakDays: number;
    shown: boolean;
  } | null>({
    queryKey: ["/api/streak/acknowledgment"],
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/streak/acknowledgment/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/streak/acknowledgment"] });
    },
  });

  if (!ack || ack.shown) return null;

  const copy = milestoneCopy[ack.streakDays];
  if (!copy) return null;

  return (
    <div
      className="rounded-xl px-5 py-5 relative"
      style={{ backgroundColor: "rgba(52, 115, 122, 0.08)" }}
      data-testid="streak-acknowledgment"
    >
      <button
        onClick={() => dismissMutation.mutate(ack.id)}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(52, 115, 122, 0.12)" }}
        data-testid="button-dismiss-streak"
      >
        <X className="w-3.5 h-3.5" style={{ color: "#34737A" }} />
      </button>
      <p
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: "#34737A" }}
      >
        {ack.streakDays} {ack.streakDays === 1 ? "Day" : "Days"}
      </p>
      <p
        className="text-[15px] leading-relaxed font-serif italic pr-6"
        style={{ color: "#302D2E" }}
        data-testid="text-streak-message"
      >
        {copy}
      </p>
    </div>
  );
}
