import { useState } from "react";
import { Calendar, ChevronRight, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

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

export function EventCard({ event, showStageTags = false }: {
  event: any;
  showStageTags?: boolean;
}) {
  const [, navigate] = useLocation();
  const [imgError, setImgError] = useState(false);
  const eventDate = new Date(event.date + "T00:00:00");
  const hasPhoto = event.venuePhotoUrl && !imgError;

  return (
    <div className="bg-white rounded-xl overflow-hidden" data-testid={`event-card-${event.id}`}>
      <button
        className="w-full text-left"
        onClick={() => navigate(`/events/${event.id}`)}
        data-testid={`button-view-event-${event.id}`}
      >
        {hasPhoto && (
          <div className="relative w-full" style={{ aspectRatio: "16/7" }}>
            <img
              src={event.venuePhotoUrl}
              alt={event.location || event.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              data-testid={`event-venue-photo-${event.id}`}
            />
            <div className="absolute top-2 left-2 w-10 h-10 rounded-lg bg-[#34737A] flex flex-col items-center justify-center shadow-sm">
              <span className="text-[8px] font-bold text-white/70 uppercase leading-none">
                {format(eventDate, "MMM").toUpperCase()}
              </span>
              <span className="text-sm font-bold text-white leading-none mt-0.5">
                {format(eventDate, "d")}
              </span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 p-3">
          {!hasPhoto && (
            <div className="shrink-0 w-12 h-12 rounded-lg bg-[#34737A] flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-white/70 uppercase leading-none">
                {format(eventDate, "MMM").toUpperCase()}
              </span>
              <span className="text-lg font-bold text-white leading-none mt-0.5">
                {format(eventDate, "d")}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#302D2E]">{event.name}</h3>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-[#868180]">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-[#868180]">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{event.location}</span>
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
          <ChevronRight className="w-4 h-4 text-[#C7C2BF] shrink-0" />
        </div>
      </button>
    </div>
  );
}
