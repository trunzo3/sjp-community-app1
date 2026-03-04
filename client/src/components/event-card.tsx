import { Calendar, ChevronDown, ChevronUp, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

const eventTypeLabels: Record<string, string> = {
  community_meeting: "Community Meeting",
  workshop: "Workshop",
  celebration: "Celebration",
  class: "Class",
  partner_session: "Partner Session",
};

const eventTypeColors: Record<string, string> = {
  community_meeting: "bg-[#34737A]/10 text-[#34737A]",
  workshop: "bg-blue-100 text-blue-700",
  celebration: "bg-purple-100 text-purple-700",
  class: "bg-amber-100 text-amber-700",
  partner_session: "bg-rose-100 text-rose-700",
};

const stageTagStyles: Record<string, string> = {
  client: "text-[#34737A] bg-[#E8F0F1]",
  alumni: "text-[#5DA592] bg-[#E6F2EF]",
};

function formatTime12h(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function EventCard({ event, expanded, onToggle, showStageTags = false }: {
  event: any;
  expanded: boolean;
  onToggle: () => void;
  showStageTags?: boolean;
}) {
  const eventDate = new Date(event.date + "T00:00:00");

  return (
    <div className="bg-white rounded-xl overflow-hidden" data-testid={`event-card-${event.id}`}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={onToggle}
        data-testid={`button-expand-event-${event.id}`}
      >
        <div className="shrink-0 w-12 h-12 rounded-lg bg-[#34737A] flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-white/70 uppercase leading-none">
            {format(eventDate, "MMM").toUpperCase()}
          </span>
          <span className="text-lg font-bold text-white leading-none mt-0.5">
            {format(eventDate, "d")}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#302D2E]">{event.name}</h3>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-[#868180]">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-[#868180]">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{event.location}</span>
            </div>
          )}
          {showStageTags && event.applicableStages?.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {event.applicableStages.map((s: string) => (
                <span
                  key={s}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${stageTagStyles[s] || "bg-[#F1EFEF] text-[#868180]"}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              ))}
            </div>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#C7C2BF] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#C7C2BF] shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[#F1EFEF]">
          <div className="mt-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${eventTypeColors[event.eventType] || ""}`}>
              {eventTypeLabels[event.eventType] || event.eventType}
            </span>
          </div>
          {event.description && (
            <p className="text-xs text-[#868180] mt-2 leading-relaxed">{event.description}</p>
          )}
          {showStageTags && event.applicableStages?.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {event.applicableStages.map((s: string) => (
                <span
                  key={s}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${stageTagStyles[s] || "bg-[#F1EFEF] text-[#868180]"}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
