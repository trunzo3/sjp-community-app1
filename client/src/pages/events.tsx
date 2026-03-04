import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Loader2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EventCard } from "@/components/event-card";

const eventTypeLabels: Record<string, string> = {
  community_meeting: "Community Meeting",
  workshop: "Workshop",
  celebration: "Celebration",
  class: "Class",
  partner_session: "Partner Session",
};

export default function EventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  return (
    <div>
      <div className="h-[3px] bg-[#979DB6] -mx-4 mb-4" />
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#302D2E]" strokeWidth={2} />
          <h1 className="text-lg font-bold text-[#302D2E]" data-testid="text-events-title">Events</h1>
        </div>
        {isStaffOrAdmin && (
          <Button size="sm" className="bg-[#34737A] text-white" onClick={() => setShowForm(!showForm)} data-testid="button-add-event">
            <Plus className="w-4 h-4 mr-1" /> New Event
          </Button>
        )}
      </div>
      <p className="text-xs text-[#868180] mb-4" data-testid="text-event-count">
        {events?.length || 0} upcoming
      </p>

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
          {events?.map((event: any) => (
            <EventCard
              key={event.id}
              event={event}
              expanded={expandedId === event.id}
              onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
              showStageTags={isStaffOrAdmin}
            />
          ))}
          {events?.length === 0 && (
            <div className="text-center py-8 text-sm text-[#C7C2BF]">No upcoming events.</div>
          )}
        </div>
      )}
    </div>
  );
}
