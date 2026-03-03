import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Loader2, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

export default function EventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "", eventType: "", date: "", startTime: "", endTime: "", location: "", description: "",
    stages: { client: false, alumni: false },
  });

  const { data: events, isLoading } = useQuery<any[]>({ queryKey: ["/api/events"] });

  const createEvent = useMutation({
    mutationFn: async () => {
      const stages: string[] = [];
      if (formData.stages.client) stages.push("client");
      if (formData.stages.alumni) stages.push("alumni");
      await apiRequest("POST", "/api/events", {
        name: formData.name,
        eventType: formData.eventType,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location,
        description: formData.description,
        applicableStages: stages,
      });
    },
    onSuccess: () => {
      setShowForm(false);
      setFormData({ name: "", eventType: "", date: "", startTime: "", endTime: "", location: "", description: "", stages: { client: false, alumni: false } });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event added" });
    },
  });

  function formatTime(t: string) {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-[#302D2E]" data-testid="text-events-title">Events</h1>
        {isStaffOrAdmin && (
          <Button size="sm" className="bg-[#34737A] text-white" onClick={() => setShowForm(!showForm)} data-testid="button-add-event">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 mb-4 space-y-3" data-testid="event-form">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#302D2E]">Add Event</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-[#C7C2BF]" /></button>
          </div>
          <Input placeholder="Event name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-event-name" />
          <Select value={formData.eventType} onValueChange={(v) => setFormData({ ...formData, eventType: v })}>
            <SelectTrigger data-testid="select-event-type"><SelectValue placeholder="Event type" /></SelectTrigger>
            <SelectContent>
              {Object.entries(eventTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} data-testid="input-event-date" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} data-testid="input-start-time" />
            <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} data-testid="input-end-time" />
          </div>
          <Input placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} data-testid="input-location" />
          <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[60px] resize-none" data-testid="input-event-description" />
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#868180]">Stages:</span>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={formData.stages.client} onCheckedChange={(c) => setFormData({ ...formData, stages: { ...formData.stages, client: !!c } })} />
              Client
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={formData.stages.alumni} onCheckedChange={(c) => setFormData({ ...formData, stages: { ...formData.stages, alumni: !!c } })} />
              Alumni
            </label>
          </div>
          <Button className="w-full bg-[#34737A] text-white" onClick={() => createEvent.mutate()} disabled={!formData.name || !formData.eventType || !formData.date || createEvent.isPending} data-testid="button-save-event">
            {createEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#34737A]" /></div>
      ) : (
        <div className="space-y-3">
          {events?.map((event: any) => {
            const eventDate = new Date(event.date + "T00:00:00");
            const monthStr = format(eventDate, "MMM").toUpperCase();
            const dayStr = format(eventDate, "d");
            return (
              <div key={event.id} className="bg-white rounded-xl p-4 flex gap-3" data-testid={`event-card-${event.id}`}>
                <div className="w-14 h-14 rounded-lg bg-[#34737A] flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-white/70 uppercase">{monthStr}</span>
                  <span className="text-lg font-bold text-white leading-tight">{dayStr}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${eventTypeColors[event.eventType] || ""}`}>
                      {eventTypeLabels[event.eventType] || event.eventType}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#302D2E]">{event.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#868180] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {event.location}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-[#C7C2BF] mt-1.5 leading-relaxed line-clamp-2">{event.description}</p>
                  )}
                  {isStaffOrAdmin && (
                    <div className="flex gap-1 mt-2">
                      {event.applicableStages?.map((s: string) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F1EFEF] text-[#868180] font-medium">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {events?.length === 0 && (
            <div className="text-center py-8 text-sm text-[#C7C2BF]">No upcoming events.</div>
          )}
        </div>
      )}
    </div>
  );
}
