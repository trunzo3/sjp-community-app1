import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AvatarCircle } from "@/components/avatar-circle";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, X, Check, ChevronDown, ChevronUp, Users, Camera, MapPin, Sparkles, BarChart3, MessageCircle, Shield, HelpCircle, FileText, Upload, ToggleLeft, ToggleRight, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const pillarColors: Record<string, string> = {
  community: "#34737A", confidence: "#F59E0B", resilience: "#EF4444", readiness: "#3B82F6", wellness: "#8B5CF6",
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

function getResourceAge(createdAt: string | null): string {
  if (!createdAt) return "";
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

const roleBadgeColors: Record<string, string> = {
  client: "bg-[#34737A] text-white",
  alumni: "bg-[#34737A] text-white",
  staff: "bg-[#34737A] text-white",
  admin: "bg-[#34737A] text-white",
};

type ResourceForm = {
  name: string; description: string; pillar: string; type: string;
  providerName: string; phone: string; websiteUrl: string;
  stages: { client: boolean; alumni: boolean };
};

type EventForm = {
  name: string; eventType: string; date: string; startTime: string; endTime: string;
  location: string; customLocation: string; description: string; hostUserId: string;
  stages: { client: boolean; alumni: boolean };
};

const emptyResourceForm: ResourceForm = {
  name: "", description: "", pillar: "", type: "", providerName: "", phone: "", websiteUrl: "",
  stages: { client: false, alumni: false },
};

const emptyEventForm: EventForm = {
  name: "", eventType: "", date: "", startTime: "", endTime: "", location: "", customLocation: "", description: "", hostUserId: "",
  stages: { client: false, alumni: false },
};

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"resources" | "events" | "venues" | "stories" | "surveys" | "users" | "ai_guide">("resources");

  const isAdmin = user?.role === "admin";
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  if (!isStaffOrAdmin) {
    navigate("/profile");
    return null;
  }

  const tabs = [
    { key: "resources" as const, label: "Resources" },
    { key: "events" as const, label: "Events" },
    { key: "venues" as const, label: "Venues" },
    { key: "stories" as const, label: "Stories" },
    { key: "surveys" as const, label: "Surveys" },
    { key: "users" as const, label: "Users" },
    { key: "ai_guide" as const, label: "AI Guide" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("/profile")} data-testid="button-back-profile">
          <ArrowLeft className="w-5 h-5 text-[#868180]" />
        </button>
        <h1 className="text-lg font-bold text-[#302D2E]" data-testid="text-admin-title">Admin Panel</h1>
      </div>
      <div className="h-[3px] bg-[#D32027] -mx-4 md:mx-0 md:rounded-full mb-4" />

      <div className="flex gap-1 overflow-x-auto md:flex-wrap pb-2 mb-4" data-testid="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-[#34737A] text-white" : "bg-white text-[#868180]"
            }`}
            data-testid={`tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resources" && <ResourcesTab />}
      {tab === "events" && <EventsTab />}
      {tab === "venues" && <VenuesTab />}
      {tab === "stories" && <StoriesTab />}
      {tab === "surveys" && <SurveysTab />}
      {tab === "users" && <UsersTab />}
      {tab === "ai_guide" && <AiGuideTab />}
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
              className={`text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap ${pillarFilter === p ? "bg-[#34737A] text-white" : "bg-[#F1EFEF] text-[#868180]"}`}
              data-testid={`admin-filter-pillar-${p}`}
            >{p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
        <Button size="sm" className="bg-[#34737A] text-white shrink-0 ml-2" onClick={() => { setEditId(null); setFormData(emptyResourceForm); setShowForm(true); }} data-testid="button-admin-new-resource">
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 mb-3 space-y-2" data-testid="admin-resource-form">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#302D2E]">{editId ? "Edit Resource" : "Add Resource"}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4 text-[#C7C2BF]" /></button>
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
          <Button className="w-full bg-[#34737A] text-white" onClick={() => saveMutation.mutate()} disabled={!formData.name || !formData.pillar || !formData.type || saveMutation.isPending} data-testid="button-admin-save-resource">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Update" : "Save"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#34737A]" /></div>
      ) : (
        <div className="space-y-2">
          {filtered?.map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl p-3 flex items-center gap-3" data-testid={`admin-resource-${r.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pillarColors[r.pillar] }}>{r.pillar}</span>
                  <span className="text-[10px] text-[#C7C2BF]">{r.type}</span>
                </div>
                <p className="text-sm font-medium text-[#302D2E] truncate">{r.name}</p>
                {r.createdAt && (
                  <span className="text-[10px] text-[#C7C2BF]" data-testid={`admin-resource-age-${r.id}`}>
                    {getResourceAge(r.createdAt)}
                  </span>
                )}
              </div>
              <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-[#F1EFEF]" data-testid={`button-edit-resource-${r.id}`}>
                <Pencil className="w-4 h-4 text-[#868180]" />
              </button>
              <button onClick={() => setDeleteId(r.id)} className="p-2 rounded-lg hover:bg-red-50" data-testid={`button-delete-resource-${r.id}`}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
          {filtered?.length === 0 && <p className="text-center py-6 text-sm text-[#C7C2BF]">No resources found.</p>}
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
  const { data: venueLocations } = useQuery<any[]>({ queryKey: ["/api/venue-locations"] });
  const { data: staffUsers } = useQuery<any[]>({ queryKey: ["/api/staff-users"] });

  const venuePhotoMap: Record<string, string> = {};
  venueLocations?.forEach((v: any) => { venuePhotoMap[v.name] = v.photoUrl; });

  function handleLocationChange(value: string) {
    if (value === "__other__") {
      setFormData({ ...formData, location: "__other__", customLocation: "" });
    } else {
      setFormData({ ...formData, location: value, customLocation: "" });
    }
  }

  function getEffectiveLocation() {
    if (formData.location === "__other__") return formData.customLocation;
    return formData.location;
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const stages: string[] = [];
      if (formData.stages.client) stages.push("client");
      if (formData.stages.alumni) stages.push("alumni");
      const effectiveLocation = getEffectiveLocation();
      const venuePhoto = venuePhotoMap[effectiveLocation] || undefined;
      const body: any = {
        name: formData.name, eventType: formData.eventType, date: formData.date,
        startTime: formData.startTime, endTime: formData.endTime,
        location: effectiveLocation, description: formData.description,
        hostUserId: formData.hostUserId || null,
        applicableStages: stages,
      };
      if (venuePhoto !== undefined) {
        body.venuePhotoUrl = venuePhoto;
      }
      if (editId) {
        await apiRequest("PATCH", `/api/events/${editId}`, body);
      } else {
        if (!body.venuePhotoUrl) body.venuePhotoUrl = null;
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
    const isKnownLocation = venueLocations?.some((v: any) => v.name === e.location);
    setFormData({
      name: e.name, eventType: e.eventType, date: e.date,
      startTime: e.startTime || "", endTime: e.endTime || "",
      location: isKnownLocation ? e.location : (e.location ? "__other__" : ""),
      customLocation: isKnownLocation ? "" : (e.location || ""),
      description: e.description || "",
      hostUserId: e.hostUserId || "",
      stages: { client: e.applicableStages?.includes("client"), alumni: e.applicableStages?.includes("alumni") },
    });
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#868180]">{events?.length || 0} events</p>
        <Button size="sm" className="bg-[#34737A] text-white" onClick={() => { setEditId(null); setFormData(emptyEventForm); setShowForm(true); }} data-testid="button-admin-new-event">
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 mb-3 space-y-2" data-testid="admin-event-form">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#302D2E]">{editId ? "Edit Event" : "Add Event"}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4 text-[#C7C2BF]" /></button>
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
          <Select value={formData.location} onValueChange={handleLocationChange}>
            <SelectTrigger data-testid="admin-select-location"><SelectValue placeholder="Select location" /></SelectTrigger>
            <SelectContent>
              {venueLocations?.map((v: any) => (
                <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
              ))}
              <SelectItem value="__other__">Other (custom location)</SelectItem>
            </SelectContent>
          </Select>
          {formData.location === "__other__" && (
            <Input placeholder="Enter custom location" value={formData.customLocation} onChange={(e) => setFormData({ ...formData, customLocation: e.target.value })} data-testid="admin-input-custom-location" />
          )}
          {formData.location && formData.location !== "__other__" && venuePhotoMap[formData.location] && (
            <div className="rounded-lg overflow-hidden" data-testid="admin-venue-photo-preview">
              <img
                src={venuePhotoMap[formData.location]}
                alt={formData.location}
                className="w-full h-24 object-cover rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
          <Select value={formData.hostUserId} onValueChange={(v) => setFormData({ ...formData, hostUserId: v === "__none__" ? "" : v })}>
            <SelectTrigger data-testid="admin-select-host"><SelectValue placeholder="Event Host (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No host</SelectItem>
              {staffUsers?.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[60px] resize-none" />
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
          <Button className="w-full bg-[#34737A] text-white" onClick={() => saveMutation.mutate()} disabled={!formData.name || !formData.eventType || !formData.date || saveMutation.isPending} data-testid="button-admin-save-event">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Update" : "Save"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#34737A]" /></div>
      ) : (
        <div className="space-y-2">
          {events?.map((e: any) => (
            <div key={e.id} className="bg-white rounded-xl p-3 flex items-center gap-3" data-testid={`admin-event-${e.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[#C7C2BF]">{eventTypeLabels[e.eventType] || e.eventType}</span>
                  <span className="text-[10px] text-[#C7C2BF]">{e.date}</span>
                </div>
                <p className="text-sm font-medium text-[#302D2E] truncate">{e.name}</p>
              </div>
              <button onClick={() => openEdit(e)} className="p-2 rounded-lg hover:bg-[#F1EFEF]" data-testid={`button-edit-event-${e.id}`}>
                <Pencil className="w-4 h-4 text-[#868180]" />
              </button>
              <button onClick={() => setDeleteId(e.id)} className="p-2 rounded-lg hover:bg-red-50" data-testid={`button-delete-event-${e.id}`}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
          {events?.length === 0 && <p className="text-center py-6 text-sm text-[#C7C2BF]">No events found.</p>}
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

function VenuesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: venues, isLoading } = useQuery<any[]>({ queryKey: ["/api/venue-locations"] });
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const handleFileSelect = (venueId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviews(prev => ({ ...prev, [venueId]: url }));
    setPendingFiles(prev => ({ ...prev, [venueId]: file }));
    setImgErrors(prev => ({ ...prev, [venueId]: false }));
  };

  const handleSave = async (venueId: string) => {
    const file = pendingFiles[venueId];
    if (!file) return;
    setUploadingId(venueId);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/admin/venues/${venueId}/photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(data.message);
      }
      setPreviews(prev => { const n = { ...prev }; delete n[venueId]; return n; });
      setPendingFiles(prev => { const n = { ...prev }; delete n[venueId]; return n; });
      queryClient.invalidateQueries({ queryKey: ["/api/venue-locations"] });
      toast({ title: "Venue photo updated" });
    } catch (err: any) {
      toast({ title: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  const handleCancel = (venueId: string) => {
    setPreviews(prev => { const n = { ...prev }; delete n[venueId]; return n; });
    setPendingFiles(prev => { const n = { ...prev }; delete n[venueId]; return n; });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-[#34737A]" />
        <p className="text-xs text-[#868180]">{venues?.length || 0} venue locations</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#34737A]" /></div>
      ) : (
        <div className="space-y-3">
          {venues?.map((venue: any) => (
            <div key={venue.id} className="bg-white rounded-xl p-3 space-y-2" data-testid={`admin-venue-${venue.id}`}>
              <p className="text-sm font-medium text-[#302D2E]" data-testid={`venue-name-${venue.id}`}>{venue.name}</p>
              <div className="rounded-lg overflow-hidden bg-[#F1EFEF]" style={{ aspectRatio: "16/9" }}>
                {previews[venue.id] ? (
                  <img src={previews[venue.id]} alt="Preview" className="w-full h-full object-cover" data-testid={`venue-preview-${venue.id}`} />
                ) : venue.photoUrl && !imgErrors[venue.id] ? (
                  <img
                    src={venue.photoUrl}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                    onError={() => setImgErrors(prev => ({ ...prev, [venue.id]: true }))}
                    data-testid={`venue-photo-${venue.id}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-[#C7C2BF]" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {previews[venue.id] ? (
                  <>
                    <Button
                      size="sm"
                      className="bg-[#34737A] text-white"
                      onClick={() => handleSave(venue.id)}
                      disabled={uploadingId === venue.id}
                      data-testid={`button-save-venue-photo-${venue.id}`}
                    >
                      {uploadingId === venue.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCancel(venue.id)} disabled={uploadingId === venue.id} data-testid={`button-cancel-venue-photo-${venue.id}`}>
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  </>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleFileSelect(venue.id, e)}
                      data-testid={`input-venue-photo-${venue.id}`}
                    />
                    <span className="inline-flex items-center gap-1 text-xs text-[#34737A] font-medium px-2 py-1 rounded-lg border border-[#34737A]/20 hover:bg-[#34737A]/5 transition-colors">
                      <Camera className="w-3 h-3" />
                      Change photo
                    </span>
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StoriesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revisionStoryId, setRevisionStoryId] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

  const { data: stories, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/stories"] });
  const { data: pendingCount } = useQuery<{ count: number }>({ queryKey: ["/api/stories/pending-count"] });

  const updateStory = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const body: any = { approvalStatus: status };
      if (note) body.revisionNote = note;
      await apiRequest("PATCH", `/api/stories/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/featured"] });
      setRevisionStoryId(null);
      setRevisionNote("");
      toast({ title: "Story updated" });
    },
  });

  const pendingStories = stories?.filter((s: any) => s.approvalStatus === "pending") || [];

  function getStatusLabel(status: string) {
    if (status === "community_only") return "Community Only";
    if (status === "revision_requested") return "Revision Requested";
    return status?.charAt(0).toUpperCase() + status?.slice(1);
  }

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
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#34737A]" /></div>
      ) : (
        <div className="space-y-3">
          {stories?.map((story: any) => (
            <div key={story.id} className="bg-white rounded-xl p-4" data-testid={`admin-story-${story.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#302D2E]">{story.author?.firstName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${approvalBadgeColors[story.approvalStatus] || "bg-orange-100 text-orange-700"}`}>
                    {getStatusLabel(story.approvalStatus)}
                  </span>
                </div>
                <button onClick={() => setExpandedId(expandedId === story.id ? null : story.id)} className="p-1">
                  {expandedId === story.id ? <ChevronUp className="w-4 h-4 text-[#868180]" /> : <ChevronDown className="w-4 h-4 text-[#868180]" />}
                </button>
              </div>

              {expandedId !== story.id && (
                <div className="space-y-1">
                  {story.step1Content && <p className="text-xs text-[#868180] line-clamp-1"><span className="font-medium text-[#34737A]">Before: </span>{story.step1Content}</p>}
                  {story.step2Content && <p className="text-xs text-[#868180] line-clamp-1"><span className="font-medium text-[#34737A]">Change: </span>{story.step2Content}</p>}
                  {story.step3Content && <p className="text-xs text-[#868180] line-clamp-1"><span className="font-medium text-[#34737A]">Now: </span>{story.step3Content}</p>}
                </div>
              )}

              {expandedId === story.id && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-[#34737A] uppercase tracking-wider mb-0.5">Where were you?</p>
                    <p className="text-xs text-[#302D2E] leading-relaxed">{story.step1Content}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#34737A] uppercase tracking-wider mb-0.5">What changed?</p>
                    <p className="text-xs text-[#302D2E] leading-relaxed">{story.step2Content}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#34737A] uppercase tracking-wider mb-0.5">Where are you now?</p>
                    <p className="text-xs text-[#302D2E] leading-relaxed">{story.step3Content}</p>
                  </div>
                </div>
              )}

              {story.approvalStatus === "revision_requested" && story.revisionNote && (
                <div className="mt-2 bg-orange-50 rounded-lg p-2.5" data-testid={`revision-note-${story.id}`}>
                  <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-0.5">Revision Note</p>
                  <p className="text-xs text-orange-800 leading-relaxed">{story.revisionNote}</p>
                </div>
              )}

              {revisionStoryId === story.id && (
                <div className="mt-3 space-y-2" data-testid={`revision-form-${story.id}`}>
                  <Textarea
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    placeholder="Describe what needs to be revised..."
                    className="min-h-[80px] resize-none text-xs"
                    data-testid={`input-revision-note-${story.id}`}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-orange-500 text-white text-xs h-7 px-3"
                      onClick={() => updateStory.mutate({ id: story.id, status: "revision_requested", note: revisionNote })}
                      disabled={!revisionNote.trim() || updateStory.isPending}
                      data-testid={`button-send-revision-${story.id}`}
                    >
                      Send Revision Request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-3"
                      onClick={() => { setRevisionStoryId(null); setRevisionNote(""); }}
                      data-testid={`button-cancel-revision-${story.id}`}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-[#C7C2BF]">
                  {story.createdAt ? format(new Date(story.createdAt), "MMM d, yyyy") : ""}
                </span>
                {(story.approvalStatus === "pending" || story.approvalStatus === "revision_requested") && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="bg-emerald-500 text-white text-xs h-7 px-3" onClick={() => updateStory.mutate({ id: story.id, status: "approved" })} disabled={updateStory.isPending} data-testid={`button-approve-story-${story.id}`}>
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3 text-blue-600 border-blue-200" onClick={() => updateStory.mutate({ id: story.id, status: "community_only" })} disabled={updateStory.isPending} data-testid={`button-community-only-${story.id}`}>
                      Community Only
                    </Button>
                    {revisionStoryId !== story.id && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-3 text-orange-600 border-orange-200" onClick={() => setRevisionStoryId(story.id)} disabled={updateStory.isPending} data-testid={`button-request-revision-${story.id}`}>
                        Request Revision
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {stories?.length === 0 && <p className="text-center py-6 text-sm text-[#C7C2BF]">No stories submitted yet.</p>}
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
          <p className="text-2xl font-bold text-[#34737A]">{totalSurveys}</p>
          <p className="text-[10px] text-[#868180] mt-0.5">Surveys</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center" data-testid="stat-employed">
          <p className="text-2xl font-bold text-[#34737A]">{employedPct}%</p>
          <p className="text-[10px] text-[#868180] mt-0.5">Employed</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center" data-testid="stat-housing">
          <p className="text-2xl font-bold text-[#34737A]">{housingPct}%</p>
          <p className="text-[10px] text-[#868180] mt-0.5">Stable Housing</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#34737A]" /></div>
      ) : (
        <div className="space-y-3">
          {surveys?.map((survey: any) => (
            <div key={survey.id} className="bg-white rounded-xl p-4" data-testid={`admin-survey-${survey.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#302D2E]">{survey.user?.firstName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${intervalBadgeColors[survey.intervalMonths] || "bg-gray-100 text-gray-600"}`}>
                    {survey.intervalMonths}-Month
                  </span>
                </div>
                <span className="text-[10px] text-[#C7C2BF]">
                  {survey.submittedAt ? format(new Date(survey.submittedAt), "MMM d, yyyy") : ""}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-[#868180]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#302D2E] w-24">Employment:</span>
                  <span>{survey.stillEmployed ? "Yes" : "No"}{survey.jobTitle ? ` — ${survey.jobTitle}` : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#302D2E] w-24">Housing:</span>
                  <span>{survey.housingStatus ? survey.housingStatus.charAt(0).toUpperCase() + survey.housingStatus.slice(1) : "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#302D2E] w-24">Raise/Promo:</span>
                  <span>{survey.raiseOrPromotion ? `Yes${survey.promotionDetails ? ` — ${survey.promotionDetails}` : ""}` : "No"}</span>
                </div>
                {survey.supportNeeds && (
                  <div>
                    <span className="font-medium text-[#302D2E]">Support needs: </span>
                    <span>{survey.supportNeeds}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {surveys?.length === 0 && <p className="text-center py-6 text-sm text-[#C7C2BF]">No surveys submitted yet.</p>}
        </div>
      )}
    </div>
  );
}

const progressPillars = [
  { key: "community", label: "Community", color: "#34737A" },
  { key: "confidence", label: "Confidence", color: "#979DB6" },
  { key: "resilience", label: "Resilience", color: "#D32027" },
  { key: "readiness", label: "Readiness", color: "#5DA592" },
  { key: "wellness", label: "Wellness", color: "#EEBBA7" },
];

function UsersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ role: "", stage: "", graduationDate: "" });
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});

  const { data: users, isLoading } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const { data: editUserProgress } = useQuery<any[]>({
    queryKey: ["/api/progress", editUserId || ""],
    enabled: !!editUserId,
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/admin/users/${editUserId}`, {
        role: editData.role,
        stage: editData.stage,
        graduationDate: editData.graduationDate || null,
      });
      for (const [pillar, progress] of Object.entries(progressValues)) {
        await apiRequest("PUT", `/api/admin/progress/${editUserId}`, { pillar, progress });
      }
    },
    onSuccess: () => {
      setEditUserId(null);
      setProgressValues({});
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({ title: "User updated" });
    },
  });

  function openEdit(u: any) {
    setEditUserId(u.id);
    setEditData({ role: u.role, stage: u.stage, graduationDate: u.graduationDate || "" });
    setProgressValues({});
  }

  function getProgressValue(pillar: string): number {
    if (progressValues[pillar] !== undefined) return progressValues[pillar];
    const entry = editUserProgress?.find((p: any) => p.pillar === pillar);
    return entry?.progress ?? 0;
  }

  function setProgress(pillar: string, value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    setProgressValues({ ...progressValues, [pillar]: clamped });
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-[#868180]" />
        <p className="text-xs text-[#868180]">{users?.length || 0} users</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#34737A]" /></div>
      ) : (
        <div className="space-y-2">
          {users?.map((u: any) => (
            <div key={u.id} className="bg-white rounded-xl p-3" data-testid={`admin-user-${u.id}`}>
              {editUserId === u.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[#302D2E]">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-[#C7C2BF]">{u.email}</p>
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
                    <label className="text-xs text-[#868180] mb-1 block">Graduation Date</label>
                    <Input type="date" value={editData.graduationDate} onChange={(e) => setEditData({ ...editData, graduationDate: e.target.value })} data-testid="admin-input-graduation-date" />
                  </div>
                  <div>
                    <label className="text-xs text-[#868180] mb-1.5 block">Pillar Progress</label>
                    <div className="space-y-1.5">
                      {progressPillars.map((p) => (
                        <div key={p.key} className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold w-20" style={{ color: p.color }}>{p.label}</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={getProgressValue(p.key)}
                            onChange={(e) => setProgress(p.key, parseInt(e.target.value) || 0)}
                            className="h-7 text-xs w-16 text-center"
                            data-testid={`admin-input-progress-${p.key}`}
                          />
                          <div className="flex-1 h-1.5 rounded-full bg-[#F1EFEF] overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${getProgressValue(p.key)}%`, backgroundColor: p.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-[#34737A] text-white" onClick={() => updateUser.mutate()} disabled={updateUser.isPending} data-testid="button-admin-save-user">
                      {updateUser.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" /> Save</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditUserId(null)} data-testid="button-admin-cancel-user">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AvatarCircle firstName={u.firstName} color={u.avatarColor} size="sm" photoUrl={u.photoUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#302D2E]">{u.firstName} {u.lastName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeColors[u.role]}`}>
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-[#C7C2BF]">{u.email}</p>
                    {u.graduationDate && <p className="text-[10px] text-[#C7C2BF] mt-0.5">Graduated: {u.graduationDate}</p>}
                  </div>
                  <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-[#F1EFEF]" data-testid={`button-edit-user-${u.id}`}>
                    <Pencil className="w-4 h-4 text-[#868180]" />
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

function AiGuideTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<"faqs" | "trusted" | "documents" | "crisis" | "analytics">("faqs");

  return (
    <div>
      <div className="flex gap-1 mb-4 overflow-x-auto md:flex-wrap" data-testid="ai-guide-sub-tabs">
        {[
          { key: "faqs" as const, label: "FAQs", icon: <HelpCircle className="w-3.5 h-3.5" /> },
          { key: "trusted" as const, label: "Trusted Answers", icon: <MessageCircle className="w-3.5 h-3.5" /> },
          { key: "documents" as const, label: "Documents", icon: <FileText className="w-3.5 h-3.5" /> },
          { key: "crisis" as const, label: "Crisis Config", icon: <Shield className="w-3.5 h-3.5" /> },
          { key: "analytics" as const, label: "Analytics", icon: <BarChart3 className="w-3.5 h-3.5" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              subTab === t.key ? "bg-[#34737A] text-white" : "bg-[#F1EFEF] text-[#868180]"
            }`}
            data-testid={`button-ai-subtab-${t.key}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {subTab === "faqs" && <FaqsSubTab />}
      {subTab === "trusted" && <TrustedAnswersSubTab />}
      {subTab === "documents" && <DocumentsSubTab />}
      {subTab === "crisis" && <CrisisConfigSubTab />}
      {subTab === "analytics" && <AnalyticsSubTab />}
    </div>
  );
}

function FaqsSubTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", tags: "", category: "", sortOrder: 0, active: true });

  const { data: faqs, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/ai/faqs"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) };
      if (editingId) {
        await apiRequest("PATCH", `/api/admin/ai/faqs/${editingId}`, payload);
      } else {
        await apiRequest("POST", "/api/admin/ai/faqs", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/faqs"] });
      setShowForm(false);
      setEditingId(null);
      toast({ title: editingId ? "FAQ updated" : "FAQ created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/ai/faqs/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/faqs"] });
      toast({ title: "FAQ deleted" });
    },
  });

  const openCreate = () => {
    setForm({ question: "", answer: "", tags: "", category: "", sortOrder: (faqs?.length || 0), active: true });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (faq: any) => {
    setForm({ question: faq.question, answer: faq.answer, tags: (faq.tags || []).join(", "), category: faq.category || "", sortOrder: faq.sortOrder, active: faq.active });
    setEditingId(faq.id);
    setShowForm(true);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#34737A]" /></div>;

  return (
    <div>
      {showForm ? (
        <div className="space-y-3" data-testid="faq-form">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#302D2E]">{editingId ? "Edit FAQ" : "New FAQ"}</h3>
            <button onClick={() => setShowForm(false)} className="text-[#868180]"><X className="w-4 h-4" /></button>
          </div>
          <Input placeholder="Question" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} data-testid="input-faq-question" />
          <Textarea placeholder="Answer" value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} rows={4} data-testid="input-faq-answer" />
          <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} data-testid="input-faq-tags" />
          <div className="flex gap-2">
            <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="flex-1" data-testid="input-faq-category" />
            <Input type="number" placeholder="Order" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-20" data-testid="input-faq-order" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: !!v }))} data-testid="checkbox-faq-active" />
            <span className="text-xs text-[#868180]">Active</span>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={!form.question || !form.answer || saveMutation.isPending} className="w-full bg-[#34737A] hover:bg-[#2C6169]" data-testid="button-save-faq">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save FAQ"}
          </Button>
        </div>
      ) : (
        <>
          <Button onClick={openCreate} className="w-full mb-3 bg-[#34737A] hover:bg-[#2C6169]" data-testid="button-add-faq">
            <Plus className="w-4 h-4 mr-1" /> Add FAQ
          </Button>
          <div className="space-y-2">
            {faqs?.map((faq: any) => (
              <div key={faq.id} className={`p-3 rounded-xl border ${faq.active ? "bg-white border-[#F1EFEF]" : "bg-gray-50 border-gray-200 opacity-60"}`} data-testid={`faq-item-${faq.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#302D2E]">{faq.question}</p>
                    <p className="text-xs text-[#868180] mt-1 line-clamp-2">{faq.answer}</p>
                    {faq.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {faq.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#34737A]/10 text-[#34737A]">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(faq)} className="p-1.5 rounded-lg hover:bg-[#F1EFEF]" data-testid={`button-edit-faq-${faq.id}`}><Pencil className="w-3.5 h-3.5 text-[#868180]" /></button>
                    <button onClick={() => deleteMutation.mutate(faq.id)} className="p-1.5 rounded-lg hover:bg-red-50" data-testid={`button-delete-faq-${faq.id}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
              </div>
            ))}
            {(!faqs || faqs.length === 0) && <p className="text-xs text-[#C7C2BF] text-center py-4">No FAQs yet</p>}
          </div>
        </>
      )}
    </div>
  );
}

function DocumentsSubTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [expandedChunks, setExpandedChunks] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", tags: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: documents, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/ai/documents"] });

  const { data: chunks } = useQuery<any[]>({
    queryKey: ["/api/admin/ai/documents", expandedChunks, "chunks"],
    enabled: !!expandedChunks,
    queryFn: async () => {
      const res = await fetch(`/api/admin/ai/documents/${expandedChunks}/chunks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load chunks");
      return res.json();
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("Uploading file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (description.trim()) formData.append("description", description.trim());
      if (tags.trim()) formData.append("tags", tags.trim());

      setUploadStatus("Extracting text & generating embeddings...");

      const res = await fetch("/api/admin/ai/documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/documents"] });
      setDescription("");
      setTags("");
      toast({ title: "Document uploaded and processed" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadStatus("");
      e.target.value = "";
    }
  };

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await apiRequest("PATCH", `/api/admin/ai/documents/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/documents"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      await apiRequest("PATCH", `/api/admin/ai/documents/${editingId}`, {
        description: editForm.description || null,
        tags: editForm.tags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/documents"] });
      setEditingId(null);
      toast({ title: "Document updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/ai/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/documents"] });
      setDeleteId(null);
      toast({ title: "Document deleted" });
    },
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fileTypeIcon = (type: string) => {
    return <FileText className={`w-4 h-4 ${type === "pdf" ? "text-red-500" : type === "docx" ? "text-blue-500" : "text-gray-500"}`} />;
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#34737A]" /></div>;

  return (
    <div>
      <div className="bg-white rounded-xl border border-[#F1EFEF] p-4 mb-4" data-testid="document-upload-form">
        <h3 className="text-sm font-semibold text-[#302D2E] mb-2">Upload Document</h3>
        <p className="text-[10px] text-[#868180] mb-3">Upload PDF, Word (.docx), or text files. The AI Guide will use these documents to answer client questions.</p>
        <div className="space-y-2 mb-3">
          <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} data-testid="input-doc-description" />
          <Input placeholder="Tags (comma-separated, optional)" value={tags} onChange={e => setTags(e.target.value)} data-testid="input-doc-tags" />
        </div>
        <label className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          uploading ? "border-[#34737A]/30 bg-[#34737A]/5" : "border-[#F1EFEF] hover:border-[#34737A]/50 hover:bg-[#34737A]/5"
        }`} data-testid="button-upload-document">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#34737A]" />
              <span className="text-xs text-[#34737A]">{uploadStatus}</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-[#868180]" />
              <span className="text-xs text-[#868180]">Choose file (.pdf, .docx, .txt)</span>
            </>
          )}
          <input
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            data-testid="input-file-document"
          />
        </label>
      </div>

      <div className="space-y-2" data-testid="documents-list">
        {documents?.map((doc: any) => (
          <div key={doc.id} className={`rounded-xl border overflow-hidden ${doc.active ? "bg-white border-[#F1EFEF]" : "bg-gray-50 border-gray-200 opacity-60"}`} data-testid={`doc-item-${doc.id}`}>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {fileTypeIcon(doc.fileType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#302D2E] truncate">{doc.originalName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#868180] uppercase">{doc.fileType}</span>
                      <span className="text-[10px] text-[#C7C2BF]">{formatSize(doc.fileSize)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#34737A]/10 text-[#34737A]">{doc.chunkCount} chunks</span>
                    </div>
                    {doc.description && <p className="text-xs text-[#868180] mt-1 line-clamp-1">{doc.description}</p>}
                    {doc.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {doc.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#A0845E]/10 text-[#A0845E]">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: doc.id, active: !doc.active })}
                    className="p-1.5 rounded-lg hover:bg-[#F1EFEF]"
                    title={doc.active ? "Deactivate" : "Activate"}
                    data-testid={`button-toggle-doc-${doc.id}`}
                  >
                    {doc.active ? <ToggleRight className="w-4 h-4 text-[#34737A]" /> : <ToggleLeft className="w-4 h-4 text-[#868180]" />}
                  </button>
                  <button
                    onClick={() => setExpandedChunks(expandedChunks === doc.id ? null : doc.id)}
                    className="p-1.5 rounded-lg hover:bg-[#F1EFEF]"
                    title="Preview chunks"
                    data-testid={`button-preview-doc-${doc.id}`}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#868180]" />
                  </button>
                  <button
                    onClick={() => {
                      setEditForm({ description: doc.description || "", tags: (doc.tags || []).join(", ") });
                      setEditingId(doc.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-[#F1EFEF]"
                    data-testid={`button-edit-doc-${doc.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#868180]" />
                  </button>
                  <button
                    onClick={() => setDeleteId(doc.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50"
                    data-testid={`button-delete-doc-${doc.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              {editingId === doc.id && (
                <div className="mt-3 pt-3 border-t border-[#F1EFEF] space-y-2">
                  <Input placeholder="Description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} data-testid="input-edit-doc-desc" />
                  <Input placeholder="Tags (comma-separated)" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} data-testid="input-edit-doc-tags" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="bg-[#34737A] hover:bg-[#2C6169]" data-testid="button-save-doc-edit">
                      {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} data-testid="button-cancel-doc-edit">Cancel</Button>
                  </div>
                </div>
              )}
            </div>

            {expandedChunks === doc.id && (
              <div className="border-t border-[#F1EFEF] bg-gray-50 p-3 max-h-60 overflow-y-auto" data-testid={`doc-chunks-${doc.id}`}>
                <p className="text-[10px] font-medium text-[#868180] mb-2">Extracted Chunks ({doc.chunkCount})</p>
                {chunks ? (
                  <div className="space-y-2">
                    {chunks.map((chunk: any) => (
                      <div key={chunk.id} className="bg-white rounded-lg border border-[#F1EFEF] p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[10px] font-medium text-[#34737A]">#{chunk.chunkIndex + 1}</span>
                          {chunk.metadata && <span className="text-[10px] text-[#868180] truncate">— {chunk.metadata}</span>}
                        </div>
                        <p className="text-[11px] text-[#302D2E] whitespace-pre-line line-clamp-4">{chunk.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[#34737A]" /></div>
                )}
              </div>
            )}
          </div>
        ))}
        {(!documents || documents.length === 0) && (
          <p className="text-xs text-[#C7C2BF] text-center py-4">No documents uploaded yet. Upload PDF, Word, or text files to give the AI Guide more context.</p>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the document and all its extracted text chunks. The AI Guide will no longer use this content.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-doc">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700" data-testid="button-confirm-delete-doc">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TrustedAnswersSubTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ triggerPhrases: "", answer: "", category: "", active: true });

  const { data: answers, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/ai/trusted-answers"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, triggerPhrases: form.triggerPhrases.split(",").map(t => t.trim()).filter(Boolean) };
      if (editingId) {
        await apiRequest("PATCH", `/api/admin/ai/trusted-answers/${editingId}`, payload);
      } else {
        await apiRequest("POST", "/api/admin/ai/trusted-answers", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/trusted-answers"] });
      setShowForm(false);
      setEditingId(null);
      toast({ title: editingId ? "Trusted answer updated" : "Trusted answer created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/ai/trusted-answers/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/trusted-answers"] });
      toast({ title: "Trusted answer deleted" });
    },
  });

  const openCreate = () => {
    setForm({ triggerPhrases: "", answer: "", category: "", active: true });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (ta: any) => {
    setForm({ triggerPhrases: (ta.triggerPhrases || []).join(", "), answer: ta.answer, category: ta.category || "", active: ta.active });
    setEditingId(ta.id);
    setShowForm(true);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#34737A]" /></div>;

  return (
    <div>
      {showForm ? (
        <div className="space-y-3" data-testid="trusted-answer-form">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#302D2E]">{editingId ? "Edit Trusted Answer" : "New Trusted Answer"}</h3>
            <button onClick={() => setShowForm(false)} className="text-[#868180]"><X className="w-4 h-4" /></button>
          </div>
          <Input placeholder="Trigger phrases (comma-separated)" value={form.triggerPhrases} onChange={e => setForm(f => ({ ...f, triggerPhrases: e.target.value }))} data-testid="input-ta-phrases" />
          <Textarea placeholder="Answer" value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} rows={4} data-testid="input-ta-answer" />
          <Input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} data-testid="input-ta-category" />
          <div className="flex items-center gap-2">
            <Checkbox checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: !!v }))} data-testid="checkbox-ta-active" />
            <span className="text-xs text-[#868180]">Active</span>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={!form.triggerPhrases || !form.answer || saveMutation.isPending} className="w-full bg-[#34737A] hover:bg-[#2C6169]" data-testid="button-save-ta">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Trusted Answer"}
          </Button>
        </div>
      ) : (
        <>
          <Button onClick={openCreate} className="w-full mb-3 bg-[#34737A] hover:bg-[#2C6169]" data-testid="button-add-ta">
            <Plus className="w-4 h-4 mr-1" /> Add Trusted Answer
          </Button>
          <div className="space-y-2">
            {answers?.map((ta: any) => (
              <div key={ta.id} className={`p-3 rounded-xl border ${ta.active ? "bg-white border-[#F1EFEF]" : "bg-gray-50 border-gray-200 opacity-60"}`} data-testid={`ta-item-${ta.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {ta.triggerPhrases?.map((p: string) => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{p}</span>
                      ))}
                    </div>
                    <p className="text-xs text-[#868180] line-clamp-2">{ta.answer}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(ta)} className="p-1.5 rounded-lg hover:bg-[#F1EFEF]" data-testid={`button-edit-ta-${ta.id}`}><Pencil className="w-3.5 h-3.5 text-[#868180]" /></button>
                    <button onClick={() => deleteMutation.mutate(ta.id)} className="p-1.5 rounded-lg hover:bg-red-50" data-testid={`button-delete-ta-${ta.id}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
              </div>
            ))}
            {(!answers || answers.length === 0) && <p className="text-xs text-[#C7C2BF] text-center py-4">No trusted answers yet</p>}
          </div>
        </>
      )}
    </div>
  );
}

function CrisisConfigSubTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    triggerWords: "", crisisMessage: "", crisisResources: "", notMonitoredDisclaimer: "", active: true,
  });
  const { data: config, isLoading } = useQuery<any>({ queryKey: ["/api/admin/ai/crisis-config"] });

  useEffect(() => {
    if (config) {
      setForm({
        triggerWords: (config.triggerWords || []).join(", "),
        crisisMessage: config.crisisMessage || "",
        crisisResources: config.crisisResources || "",
        notMonitoredDisclaimer: config.notMonitoredDisclaimer || "",
        active: config.active !== false,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/ai/crisis-config", {
        ...form,
        triggerWords: form.triggerWords.split(",").map(t => t.trim()).filter(Boolean),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/crisis-config"] });
      toast({ title: "Crisis configuration saved" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#34737A]" /></div>;

  return (
    <div className="space-y-3" data-testid="crisis-config-form">
      <p className="text-xs text-[#868180]">Configure crisis detection trigger words and the response shown to users in distress.</p>
      <div>
        <label className="text-xs font-medium text-[#302D2E] mb-1 block">Trigger Words (comma-separated)</label>
        <Textarea value={form.triggerWords} onChange={e => setForm(f => ({ ...f, triggerWords: e.target.value }))} rows={3} data-testid="input-crisis-triggers" />
      </div>
      <div>
        <label className="text-xs font-medium text-[#302D2E] mb-1 block">Crisis Message</label>
        <Textarea value={form.crisisMessage} onChange={e => setForm(f => ({ ...f, crisisMessage: e.target.value }))} rows={2} data-testid="input-crisis-message" />
      </div>
      <div>
        <label className="text-xs font-medium text-[#302D2E] mb-1 block">Crisis Resources</label>
        <Textarea value={form.crisisResources} onChange={e => setForm(f => ({ ...f, crisisResources: e.target.value }))} rows={5} data-testid="input-crisis-resources" />
      </div>
      <div>
        <label className="text-xs font-medium text-[#302D2E] mb-1 block">"Not Monitored" Disclaimer</label>
        <Textarea value={form.notMonitoredDisclaimer} onChange={e => setForm(f => ({ ...f, notMonitoredDisclaimer: e.target.value }))} rows={2} data-testid="input-crisis-disclaimer" />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: !!v }))} data-testid="checkbox-crisis-active" />
        <span className="text-xs text-[#868180]">Active</span>
      </div>
      <Button onClick={() => saveMutation.mutate()} disabled={!form.triggerWords || !form.crisisMessage || saveMutation.isPending} className="w-full bg-[#34737A] hover:bg-[#2C6169]" data-testid="button-save-crisis">
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Crisis Configuration"}
      </Button>
    </div>
  );
}

function AnalyticsSubTab() {
  const { data, isLoading } = useQuery<{ logs: any[]; stats: { totalQueries: number; noMatchQueries: number; crisisCount: number; topQueries: { query: string; count: number }[] } }>({
    queryKey: ["/api/admin/ai/query-logs"],
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#34737A]" /></div>;

  const stats = data?.stats;
  const logs = data?.logs || [];

  return (
    <div className="space-y-4" data-testid="ai-analytics">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-[#F1EFEF] p-3 text-center" data-testid="stat-total-queries">
          <p className="text-xl font-bold text-[#34737A]">{stats?.totalQueries || 0}</p>
          <p className="text-[10px] text-[#868180]">Total Queries</p>
        </div>
        <div className="bg-white rounded-xl border border-[#F1EFEF] p-3 text-center" data-testid="stat-no-match">
          <p className="text-xl font-bold text-amber-600">{stats?.noMatchQueries || 0}</p>
          <p className="text-[10px] text-[#868180]">No Matches</p>
        </div>
        <div className="bg-white rounded-xl border border-[#F1EFEF] p-3 text-center" data-testid="stat-crisis">
          <p className="text-xl font-bold text-red-600">{stats?.crisisCount || 0}</p>
          <p className="text-[10px] text-[#868180]">Crisis Detected</p>
        </div>
      </div>

      {stats?.topQueries && stats.topQueries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#302D2E] mb-2">Top Queries</h3>
          <div className="space-y-1.5">
            {stats.topQueries.slice(0, 10).map((q, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg border border-[#F1EFEF] px-3 py-2">
                <p className="text-xs text-[#302D2E] truncate flex-1">{q.query}</p>
                <span className="text-xs font-medium text-[#34737A] ml-2">{q.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats?.noMatchQueries && stats.noMatchQueries > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#302D2E] mb-2">Recent Unmatched Queries</h3>
          <p className="text-[10px] text-[#868180] mb-2">Consider adding FAQs or trusted answers for these topics.</p>
          <div className="space-y-1">
            {logs.filter(l => l.matchedContentType === "none").slice(0, 10).map((l: any, i: number) => (
              <div key={i} className="bg-amber-50 rounded-lg border border-amber-100 px-3 py-2">
                <p className="text-xs text-amber-800">{l.query}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!stats?.totalQueries || stats.totalQueries === 0) && (
        <p className="text-xs text-[#C7C2BF] text-center py-4">No query data yet. Analytics will appear once users start using the AI Guide.</p>
      )}
    </div>
  );
}
