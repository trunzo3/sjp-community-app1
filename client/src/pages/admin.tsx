import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, X, Check, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const pillarColors: Record<string, string> = {
  community: "#0D9488", confidence: "#F59E0B", resilience: "#EF4444", readiness: "#3B82F6", wellness: "#8B5CF6",
};

const eventTypeLabels: Record<string, string> = {
  community_meeting: "Community Meeting", workshop: "Workshop", celebration: "Celebration", class: "Class", partner_session: "Partner Session",
};

const approvalBadgeColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  community_only: "bg-blue-100 text-blue-700",
};

const intervalBadgeColors: Record<number, string> = {
  3: "bg-blue-100 text-blue-700",
  6: "bg-purple-100 text-purple-700",
  12: "bg-emerald-100 text-emerald-700",
};

const roleBadgeColors: Record<string, string> = {
  client: "bg-blue-100 text-blue-700",
  alumni: "bg-emerald-100 text-emerald-700",
  staff: "bg-orange-100 text-orange-700",
  admin: "bg-purple-100 text-purple-700",
};

type ResourceForm = {
  name: string; description: string; pillar: string; type: string;
  providerName: string; phone: string; websiteUrl: string;
  stages: { client: boolean; alumni: boolean };
};

type EventForm = {
  name: string; eventType: string; date: string; startTime: string; endTime: string;
  location: string; description: string;
  stages: { client: boolean; alumni: boolean };
};

const emptyResourceForm: ResourceForm = {
  name: "", description: "", pillar: "", type: "", providerName: "", phone: "", websiteUrl: "",
  stages: { client: false, alumni: false },
};

const emptyEventForm: EventForm = {
  name: "", eventType: "", date: "", startTime: "", endTime: "", location: "", description: "",
  stages: { client: false, alumni: false },
};

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"resources" | "events" | "stories" | "surveys" | "users">("resources");

  const isAdmin = user?.role === "admin";
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  if (!isStaffOrAdmin) {
    navigate("/profile");
    return null;
  }

  const tabs = [
    { key: "resources" as const, label: "Resources" },
    { key: "events" as const, label: "Events" },
    { key: "stories" as const, label: "Stories" },
    { key: "surveys" as const, label: "Surveys" },
    ...(isAdmin ? [{ key: "users" as const, label: "Users" }] : []),
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("/profile")} data-testid="button-back-profile">
          <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <h1 className="text-lg font-bold text-[#111827]" data-testid="text-admin-title">Admin Panel</h1>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4" data-testid="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-[#0D9488] text-white" : "bg-white text-[#6B7280]"
            }`}
            data-testid={`tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resources" && <ResourcesTab />}
      {tab === "events" && <EventsTab />}
      {tab === "stories" && <StoriesTab />}
      {tab === "surveys" && <SurveysTab />}
      {tab === "users" && isAdmin && <UsersTab />}
    </div>
  );
}

function ResourcesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ResourceForm>(emptyResourceForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pillarFilter, setPillarFilter] = useState("all");

  const { data: resources, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/resources"] });

  const filtered = pillarFilter === "all" ? resources : resources?.filter((r: any) => r.pillar === pillarFilter);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const stages: string[] = [];
      if (formData.stages.client) stages.push("client");
      if (formData.stages.alumni) stages.push("alumni");
      const body = {
        name: formData.name, description: formData.description, pillar: formData.pillar,
        type: formData.type, providerName: formData.providerName,
        phone: formData.phone || null, websiteUrl: formData.websiteUrl || null, applicableStages: stages,
      };
      if (editId) {
        await apiRequest("PATCH", `/api/resources/${editId}`, body);
      } else {
        await apiRequest("POST", "/api/resources", body);
      }
    },
    onSuccess: () => {
      setShowForm(false); setEditId(null); setFormData(emptyResourceForm);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: editId ? "Resource updated" : "Resource added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/resources/${id}`); },
    onSuccess: () => {
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: "Resource deleted" });
    },
  });

  function openEdit(r: any) {
    setEditId(r.id);
    setFormData({
      name: r.name, description: r.description || "", pillar: r.pillar, type: r.type,
      providerName: r.providerName || "", phone: r.phone || "", websiteUrl: r.websiteUrl || "",
      stages: { client: r.applicableStages?.includes("client"), alumni: r.applicableStages?.includes("alumni") },
    });
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 overflow-x-auto">
          {["all", "community", "confidence", "resilience", "readiness", "wellness"].map((p) => (
            <button key={p} onClick={() => setPillarFilter(p)}
              className={`text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap ${pillarFilter === p ? "bg-[#0D9488] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}
              data-testid={`admin-filter-pillar-${p}`}
            >{p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
        <Button size="sm" className="bg-[#0D9488] text-white shrink-0 ml-2" onClick={() => { setEditId(null); setFormData(emptyResourceForm); setShowForm(true); }} data-testid="button-admin-new-resource">
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 mb-3 space-y-2" data-testid="admin-resource-form">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111827]">{editId ? "Edit Resource" : "Add Resource"}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4 text-[#9CA3AF]" /></button>
          </div>
          <Input placeholder="Resource name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="admin-input-resource-name" />
          <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[60px] resize-none" data-testid="admin-input-resource-desc" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={formData.pillar} onValueChange={(v) => setFormData({ ...formData, pillar: v })}>
              <SelectTrigger data-testid="admin-select-pillar"><SelectValue placeholder="Pillar" /></SelectTrigger>
              <SelectContent>
                {["community", "confidence", "resilience", "readiness", "wellness"].map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger data-testid="admin-select-type"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {["partner", "program", "service", "opportunity"].map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Provider name" value={formData.providerName} onChange={(e) => setFormData({ ...formData, providerName: e.target.value })} data-testid="admin-input-provider" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input placeholder="Website" value={formData.websiteUrl} onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#6B7280]">Stages:</span>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={formData.stages.client} onCheckedChange={(c) => setFormData({ ...formData, stages: { ...formData.stages, client: !!c } })} />
              Client
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={formData.stages.alumni} onCheckedChange={(c) => setFormData({ ...formData, stages: { ...formData.stages, alumni: !!c } })} />
              Alumni
            </label>
          </div>
          <Button className="w-full bg-[#0D9488] text-white" onClick={() => saveMutation.mutate()} disabled={!formData.name || !formData.pillar || !formData.type || saveMutation.isPending} data-testid="button-admin-save-resource">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Update" : "Save"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>
      ) : (
        <div className="space-y-2">
          {filtered?.map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl p-3 flex items-center gap-3" data-testid={`admin-resource-${r.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pillarColors[r.pillar] }}>{r.pillar}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{r.type}</span>
                </div>
                <p className="text-sm font-medium text-[#111827] truncate">{r.name}</p>
              </div>
              <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-[#F3F4F6]" data-testid={`button-edit-resource-${r.id}`}>
                <Pencil className="w-4 h-4 text-[#6B7280]" />
              </button>
              <button onClick={() => setDeleteId(r.id)} className="p-2 rounded-lg hover:bg-red-50" data-testid={`button-delete-resource-${r.id}`}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
          {filtered?.length === 0 && <p className="text-center py-6 text-sm text-[#9CA3AF]">No resources found.</p>}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this resource. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 text-white hover:bg-red-600" onClick={() => deleteId && deleteMutation.mutate(deleteId)} data-testid="button-confirm-delete">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EventsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventForm>(emptyEventForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: events, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/events"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const stages: string[] = [];
      if (formData.stages.client) stages.push("client");
      if (formData.stages.alumni) stages.push("alumni");
      const body = {
        name: formData.name, eventType: formData.eventType, date: formData.date,
        startTime: formData.startTime, endTime: formData.endTime,
        location: formData.location, description: formData.description, applicableStages: stages,
      };
      if (editId) {
        await apiRequest("PATCH", `/api/events/${editId}`, body);
      } else {
        await apiRequest("POST", "/api/events", body);
      }
    },
    onSuccess: () => {
      setShowForm(false); setEditId(null); setFormData(emptyEventForm);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: editId ? "Event updated" : "Event added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/events/${id}`); },
    onSuccess: () => {
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event deleted" });
    },
  });

  function openEdit(e: any) {
    setEditId(e.id);
    setFormData({
      name: e.name, eventType: e.eventType, date: e.date,
      startTime: e.startTime || "", endTime: e.endTime || "",
      location: e.location || "", description: e.description || "",
      stages: { client: e.applicableStages?.includes("client"), alumni: e.applicableStages?.includes("alumni") },
    });
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#6B7280]">{events?.length || 0} events</p>
        <Button size="sm" className="bg-[#0D9488] text-white" onClick={() => { setEditId(null); setFormData(emptyEventForm); setShowForm(true); }} data-testid="button-admin-new-event">
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 mb-3 space-y-2" data-testid="admin-event-form">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111827]">{editId ? "Edit Event" : "Add Event"}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4 text-[#9CA3AF]" /></button>
          </div>
          <Input placeholder="Event name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="admin-input-event-name" />
          <Select value={formData.eventType} onValueChange={(v) => setFormData({ ...formData, eventType: v })}>
            <SelectTrigger data-testid="admin-select-event-type"><SelectValue placeholder="Event type" /></SelectTrigger>
            <SelectContent>
              {Object.entries(eventTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} data-testid="admin-input-event-date" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} data-testid="admin-input-start-time" />
            <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} data-testid="admin-input-end-time" />
          </div>
          <Input placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
          <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[60px] resize-none" />
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#6B7280]">Stages:</span>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={formData.stages.client} onCheckedChange={(c) => setFormData({ ...formData, stages: { ...formData.stages, client: !!c } })} />
              Client
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={formData.stages.alumni} onCheckedChange={(c) => setFormData({ ...formData, stages: { ...formData.stages, alumni: !!c } })} />
              Alumni
            </label>
          </div>
          <Button className="w-full bg-[#0D9488] text-white" onClick={() => saveMutation.mutate()} disabled={!formData.name || !formData.eventType || !formData.date || saveMutation.isPending} data-testid="button-admin-save-event">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Update" : "Save"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>
      ) : (
        <div className="space-y-2">
          {events?.map((e: any) => (
            <div key={e.id} className="bg-white rounded-xl p-3 flex items-center gap-3" data-testid={`admin-event-${e.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[#9CA3AF]">{eventTypeLabels[e.eventType] || e.eventType}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{e.date}</span>
                </div>
                <p className="text-sm font-medium text-[#111827] truncate">{e.name}</p>
              </div>
              <button onClick={() => openEdit(e)} className="p-2 rounded-lg hover:bg-[#F3F4F6]" data-testid={`button-edit-event-${e.id}`}>
                <Pencil className="w-4 h-4 text-[#6B7280]" />
              </button>
              <button onClick={() => setDeleteId(e.id)} className="p-2 rounded-lg hover:bg-red-50" data-testid={`button-delete-event-${e.id}`}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
          {events?.length === 0 && <p className="text-center py-6 text-sm text-[#9CA3AF]">No events found.</p>}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this event. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 text-white hover:bg-red-600" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StoriesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: stories, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/stories"] });
  const { data: pendingCount } = useQuery<{ count: number }>({ queryKey: ["/api/stories/pending-count"] });

  const updateStory = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/stories/${id}`, { approvalStatus: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/featured"] });
      toast({ title: "Story updated" });
    },
  });

  const pendingStories = stories?.filter((s: any) => s.approvalStatus === "pending") || [];

  return (
    <div>
      {pendingCount && pendingCount.count > 0 && (
        <div className="bg-amber-50 rounded-xl p-3 mb-3 flex items-center gap-2" data-testid="pending-stories-banner">
          <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{pendingCount.count}</span>
          </div>
          <p className="text-sm font-medium text-amber-800">
            {pendingCount.count === 1 ? "1 story" : `${pendingCount.count} stories`} pending review
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>
      ) : (
        <div className="space-y-3">
          {stories?.map((story: any) => (
            <div key={story.id} className="bg-white rounded-xl p-4" data-testid={`admin-story-${story.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#111827]">{story.author?.firstName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${approvalBadgeColors[story.approvalStatus]}`}>
                    {story.approvalStatus === "community_only" ? "Community Only" : story.approvalStatus?.charAt(0).toUpperCase() + story.approvalStatus?.slice(1)}
                  </span>
                </div>
                <button onClick={() => setExpandedId(expandedId === story.id ? null : story.id)} className="p-1">
                  {expandedId === story.id ? <ChevronUp className="w-4 h-4 text-[#6B7280]" /> : <ChevronDown className="w-4 h-4 text-[#6B7280]" />}
                </button>
              </div>

              {expandedId !== story.id && (
                <div className="space-y-1">
                  {story.step1Content && <p className="text-xs text-[#6B7280] line-clamp-1"><span className="font-medium text-[#0D9488]">Before: </span>{story.step1Content}</p>}
                  {story.step2Content && <p className="text-xs text-[#6B7280] line-clamp-1"><span className="font-medium text-[#0D9488]">Change: </span>{story.step2Content}</p>}
                  {story.step3Content && <p className="text-xs text-[#6B7280] line-clamp-1"><span className="font-medium text-[#0D9488]">Now: </span>{story.step3Content}</p>}
                </div>
              )}

              {expandedId === story.id && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-wider mb-0.5">Where were you?</p>
                    <p className="text-xs text-[#111827] leading-relaxed">{story.step1Content}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-wider mb-0.5">What changed?</p>
                    <p className="text-xs text-[#111827] leading-relaxed">{story.step2Content}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#0D9488] uppercase tracking-wider mb-0.5">Where are you now?</p>
                    <p className="text-xs text-[#111827] leading-relaxed">{story.step3Content}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-[#9CA3AF]">
                  {story.createdAt ? format(new Date(story.createdAt), "MMM d, yyyy") : ""}
                </span>
                {story.approvalStatus === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-500 text-white text-xs h-7 px-3" onClick={() => updateStory.mutate({ id: story.id, status: "approved" })} disabled={updateStory.isPending} data-testid={`button-approve-story-${story.id}`}>
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3 text-blue-600 border-blue-200" onClick={() => updateStory.mutate({ id: story.id, status: "community_only" })} disabled={updateStory.isPending} data-testid={`button-community-only-${story.id}`}>
                      Community Only
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {stories?.length === 0 && <p className="text-center py-6 text-sm text-[#9CA3AF]">No stories submitted yet.</p>}
        </div>
      )}
    </div>
  );
}

function SurveysTab() {
  const { data: surveys, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/surveys"] });

  const totalSurveys = surveys?.length || 0;
  const employedCount = surveys?.filter((s: any) => s.stillEmployed).length || 0;
  const stableHousingCount = surveys?.filter((s: any) => s.housingStatus === "stable").length || 0;
  const employedPct = totalSurveys > 0 ? Math.round((employedCount / totalSurveys) * 100) : 0;
  const housingPct = totalSurveys > 0 ? Math.round((stableHousingCount / totalSurveys) * 100) : 0;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl p-3 text-center" data-testid="stat-total-surveys">
          <p className="text-2xl font-bold text-[#0D9488]">{totalSurveys}</p>
          <p className="text-[10px] text-[#6B7280] mt-0.5">Surveys</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center" data-testid="stat-employed">
          <p className="text-2xl font-bold text-[#0D9488]">{employedPct}%</p>
          <p className="text-[10px] text-[#6B7280] mt-0.5">Employed</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center" data-testid="stat-housing">
          <p className="text-2xl font-bold text-[#0D9488]">{housingPct}%</p>
          <p className="text-[10px] text-[#6B7280] mt-0.5">Stable Housing</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>
      ) : (
        <div className="space-y-3">
          {surveys?.map((survey: any) => (
            <div key={survey.id} className="bg-white rounded-xl p-4" data-testid={`admin-survey-${survey.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#111827]">{survey.user?.firstName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${intervalBadgeColors[survey.intervalMonths] || "bg-gray-100 text-gray-600"}`}>
                    {survey.intervalMonths}-Month
                  </span>
                </div>
                <span className="text-[10px] text-[#9CA3AF]">
                  {survey.submittedAt ? format(new Date(survey.submittedAt), "MMM d, yyyy") : ""}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-[#6B7280]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#111827] w-24">Employment:</span>
                  <span>{survey.stillEmployed ? "Yes" : "No"}{survey.jobTitle ? ` — ${survey.jobTitle}` : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#111827] w-24">Housing:</span>
                  <span>{survey.housingStatus ? survey.housingStatus.charAt(0).toUpperCase() + survey.housingStatus.slice(1) : "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#111827] w-24">Raise/Promo:</span>
                  <span>{survey.raiseOrPromotion ? `Yes${survey.promotionDetails ? ` — ${survey.promotionDetails}` : ""}` : "No"}</span>
                </div>
                {survey.supportNeeds && (
                  <div>
                    <span className="font-medium text-[#111827]">Support needs: </span>
                    <span>{survey.supportNeeds}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {surveys?.length === 0 && <p className="text-center py-6 text-sm text-[#9CA3AF]">No surveys submitted yet.</p>}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ role: "", stage: "", graduationDate: "" });

  const { data: users, isLoading } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const updateUser = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/admin/users/${editUserId}`, {
        role: editData.role,
        stage: editData.stage,
        graduationDate: editData.graduationDate || null,
      });
    },
    onSuccess: () => {
      setEditUserId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User updated" });
    },
  });

  function openEdit(u: any) {
    setEditUserId(u.id);
    setEditData({ role: u.role, stage: u.stage, graduationDate: u.graduationDate || "" });
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-[#6B7280]" />
        <p className="text-xs text-[#6B7280]">{users?.length || 0} users</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>
      ) : (
        <div className="space-y-2">
          {users?.map((u: any) => (
            <div key={u.id} className="bg-white rounded-xl p-3" data-testid={`admin-user-${u.id}`}>
              {editUserId === u.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[#111827]">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-[#9CA3AF]">{u.email}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={editData.role} onValueChange={(v) => setEditData({ ...editData, role: v })}>
                      <SelectTrigger data-testid="admin-select-user-role"><SelectValue placeholder="Role" /></SelectTrigger>
                      <SelectContent>
                        {["client", "alumni", "staff", "admin"].map((r) => (
                          <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={editData.stage} onValueChange={(v) => setEditData({ ...editData, stage: v })}>
                      <SelectTrigger data-testid="admin-select-user-stage"><SelectValue placeholder="Stage" /></SelectTrigger>
                      <SelectContent>
                        {["client", "alumni"].map((s) => (
                          <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1 block">Graduation Date</label>
                    <Input type="date" value={editData.graduationDate} onChange={(e) => setEditData({ ...editData, graduationDate: e.target.value })} data-testid="admin-input-graduation-date" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-[#0D9488] text-white" onClick={() => updateUser.mutate()} disabled={updateUser.isPending} data-testid="button-admin-save-user">
                      {updateUser.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" /> Save</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditUserId(null)} data-testid="button-admin-cancel-user">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#111827]">{u.firstName} {u.lastName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeColors[u.role]}`}>
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-[#9CA3AF]">{u.email}</p>
                    {u.graduationDate && <p className="text-[10px] text-[#9CA3AF] mt-0.5">Graduated: {u.graduationDate}</p>}
                  </div>
                  <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-[#F3F4F6]" data-testid={`button-edit-user-${u.id}`}>
                    <Pencil className="w-4 h-4 text-[#6B7280]" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
