import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { AvatarCircle } from "@/components/avatar-circle";
import { ArrowLeft, Calendar, Clock, MapPin, Loader2 } from "lucide-react";
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

function formatTime12h(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getMapsUrl(location: string) {
  const encoded = encodeURIComponent(location);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return `maps://maps.apple.com/?q=${encoded}`;
  }
  return `https://maps.google.com/maps?q=${encoded}`;
}

export default function EventDetailPage() {
  const [, params] = useRoute("/events/:id");
  const [, navigate] = useLocation();
  const [venueImgError, setVenueImgError] = useState(false);

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/events", params?.id],
    enabled: !!params?.id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#34737A]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[#868180]">Event not found.</p>
        <button onClick={() => navigate("/events")} className="mt-2 text-sm text-[#34737A] font-medium" data-testid="link-back-events">
          Back to Events
        </button>
      </div>
    );
  }

  const eventDate = new Date(event.date + "T00:00:00");

  return (
    <div className="max-w-[700px] md:mx-0">
      <div className="h-[3px] bg-[#979DB6] -mx-4 md:mx-0 md:rounded-full mb-4" />

      <button
        onClick={() => navigate("/events")}
        className="flex items-center gap-1.5 text-sm text-[#34737A] font-medium mb-4"
        data-testid="button-back-events"
      >
        <ArrowLeft className="w-4 h-4" />
        Events
      </button>

      {event.venuePhotoUrl && !venueImgError && (
        <div className="rounded-xl overflow-hidden mb-4" data-testid="venue-photo">
          <img
            src={event.venuePhotoUrl}
            alt={event.location || "Venue"}
            className="w-full h-48 md:h-64 object-cover"
            onError={() => setVenueImgError(true)}
          />
        </div>
      )}

      <div className="bg-white rounded-xl p-5 mb-4" data-testid="event-detail-card">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-14 h-14 rounded-lg bg-[#34737A] flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-white/70 uppercase leading-none">
              {format(eventDate, "MMM").toUpperCase()}
            </span>
            <span className="text-xl font-bold text-white leading-none mt-0.5">
              {format(eventDate, "d")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#302D2E]" data-testid="text-event-name">{event.name}</h1>
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${eventTypeColors[event.eventType] || ""}`} data-testid="badge-event-type">
              {eventTypeLabels[event.eventType] || event.eventType}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-2.5 text-sm text-[#302D2E]">
            <Calendar className="w-4 h-4 text-[#34737A] shrink-0" />
            <span data-testid="text-event-date">{format(eventDate, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-[#302D2E]">
            <Clock className="w-4 h-4 text-[#34737A] shrink-0" />
            <span data-testid="text-event-time">{formatTime12h(event.startTime)} – {formatTime12h(event.endTime)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2.5 text-sm">
              <MapPin className="w-4 h-4 text-[#34737A] shrink-0" />
              <a
                href={getMapsUrl(event.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#34737A] font-medium underline"
                data-testid="link-get-directions"
              >
                {event.location}
              </a>
            </div>
          )}
        </div>

        {event.description && (
          <div className="border-t border-[#F1EFEF] pt-4">
            <p className="text-sm text-[#302D2E] leading-relaxed" data-testid="text-event-description">{event.description}</p>
          </div>
        )}
      </div>

      {event.host && (
        <div className="bg-white rounded-xl p-4 mb-4" data-testid="host-card">
          <p className="text-[10px] font-semibold text-[#C7C2BF] uppercase tracking-wider mb-3">Event Host</p>
          <div className="flex items-start gap-3">
            <AvatarCircle
              firstName={event.host.firstName}
              color={event.host.avatarColor}
              size="md"
              photoUrl={event.host.photoUrl}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#302D2E]" data-testid="text-host-name">{event.host.firstName}</span>
                <span className="text-[10px] text-[#868180]">—</span>
                <span className="text-[10px] font-medium text-[#34737A]" data-testid="text-host-role">
                  {event.host.role.charAt(0).toUpperCase() + event.host.role.slice(1)}
                </span>
              </div>
              {event.host.bio && (
                <p className="text-xs text-[#868180] mt-1 leading-relaxed" data-testid="text-host-bio">{event.host.bio}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
