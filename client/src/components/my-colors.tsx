import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { textOnColor } from "@/data/mood-taxonomy";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { format, startOfWeek, addDays, subDays, isSameDay } from "date-fns";
import type { MoodCheckin } from "@shared/schema";

export function MyColors() {
  const [showTimeline, setShowTimeline] = useState(false);
  const [tooltipCheckin, setTooltipCheckin] = useState<MoodCheckin | null>(null);

  const { data: history, isLoading } = useQuery<MoodCheckin[]>({
    queryKey: ["/api/mood/history"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-[#34737A]" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 text-center">
        <p className="text-sm text-[#868180]">Your mood colors will appear here after your first check-in.</p>
      </div>
    );
  }

  const today = new Date();
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  const endDate = today;
  const startDate = subDays(today, 89);
  const gridStart = startOfWeek(startDate, { weekStartsOn: 0 });

  const cells: { date: Date; checkin: MoodCheckin | undefined }[] = [];
  let current = gridStart;
  while (current <= endDate || current.getDay() !== 0) {
    if (current > endDate && current.getDay() === 0 && cells.length > 0) break;
    const checkin = history.find(h => isSameDay(new Date(h.checkedInAt), current));
    cells.push({ date: new Date(current), checkin });
    current = addDays(current, 1);
    if (current > addDays(endDate, 6)) break;
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const recentCheckins = history.slice(0, 14);

  return (
    <div className="space-y-4" data-testid="my-colors-section">
      <div className="bg-white rounded-xl p-4">
        <h3 className="text-sm font-bold text-[#302D2E] mb-3" data-testid="text-my-colors-title">My Colors — 90 Days</h3>

        <div className="flex gap-1 mb-1">
          {dayLabels.map((d, i) => (
            <div key={i} className="flex-1 text-center text-[9px] font-medium text-[#C7C2BF]">{d}</div>
          ))}
        </div>

        <div className="space-y-1 max-h-[260px] overflow-y-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex gap-1">
              {week.map((cell, ci) => {
                const isToday = isSameDay(cell.date, today);
                const inRange = cell.date >= startDate && cell.date <= endDate;
                const bgColor = cell.checkin ? cell.checkin.outerColor : "#E5E1DE";
                return (
                  <div key={ci} className="flex-1 flex justify-center">
                    <button
                      onClick={() => cell.checkin && setTooltipCheckin(
                        tooltipCheckin?.id === cell.checkin.id ? null : cell.checkin
                      )}
                      className={`w-[34px] h-[34px] rounded-md transition-all ${
                        isToday ? "ring-2 ring-[#302D2E] ring-offset-1" : ""
                      } ${!inRange ? "opacity-20" : ""}`}
                      style={{ backgroundColor: inRange ? bgColor : "transparent" }}
                      data-testid={`color-cell-${format(cell.date, "yyyy-MM-dd")}`}
                      disabled={!cell.checkin}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {tooltipCheckin && (
          <div
            className="mt-3 p-3 rounded-xl border border-[#E5E1DE] bg-[#FFFBF9]"
            data-testid="mood-tooltip"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1">
                {[tooltipCheckin.coreColor, tooltipCheckin.midColor, tooltipCheckin.outerColor].map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-sm font-semibold" style={{ color: tooltipCheckin.outerColor }}>
                {tooltipCheckin.outerLabel}
              </span>
            </div>
            <p className="text-xs text-[#868180]">{format(new Date(tooltipCheckin.checkedInAt), "EEEE, MMMM d")}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="w-full flex items-center justify-between"
          data-testid="button-toggle-timeline"
        >
          <h3 className="text-sm font-bold text-[#302D2E]">Recent Check-Ins</h3>
          {showTimeline ? (
            <ChevronUp className="w-4 h-4 text-[#868180]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#868180]" />
          )}
        </button>

        {showTimeline && (
          <div className="mt-3 space-y-2">
            {recentCheckins.map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center gap-3 py-2"
                data-testid={`timeline-entry-${checkin.id}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  {[checkin.coreColor, checkin.midColor, checkin.outerColor].map((c, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: checkin.outerColor }}>
                    {checkin.outerLabel}
                  </span>
                  <p className="text-[11px] text-[#C7C2BF]">
                    {format(new Date(checkin.checkedInAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div
                  className="w-7 h-7 rounded-lg shrink-0"
                  style={{ backgroundColor: checkin.outerColor }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
