import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Phone, Globe, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const pillars = ["all", "community", "confidence", "resilience", "readiness", "wellness"];
const pillarColors: Record<string, string> = {
  community: "#0D9488",
  confidence: "#F59E0B",
  resilience: "#EF4444",
  readiness: "#3B82F6",
  wellness: "#8B5CF6",
};

export default function ResourcesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";
  const [pillarFilter, setPillarFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "", description: "", pillar: "", type: "", providerName: "", phone: "", websiteUrl: "",
    stages: { client: false, alumni: false },
  });

  const queryParams = new URLSearchParams();
  if (pillarFilter !== "all") queryParams.set("pillar", pillarFilter);
  if (isStaffOrAdmin && stageFilter !== "all") queryParams.set("stage", stageFilter);

  const { data: resources, isLoading } = useQuery<any[]>({
    queryKey: ["/api/resources", `?${queryParams.toString()}`],
  });

  const createResource = useMutation({
    mutationFn: async () => {
      const stages: string[] = [];
      if (formData.stages.client) stages.push("client");
      if (formData.stages.alumni) stages.push("alumni");
      await apiRequest("POST", "/api/resources", {
        name: formData.name,
        description: formData.description,
        pillar: formData.pillar,
        type: formData.type,
        providerName: formData.providerName,
        phone: formData.phone || null,
        websiteUrl: formData.websiteUrl || null,
        applicableStages: stages,
      });
    },
    onSuccess: () => {
      setShowForm(false);
      setFormData({ name: "", description: "", pillar: "", type: "", providerName: "", phone: "", websiteUrl: "", stages: { client: false, alumni: false } });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: "Resource added" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-[#111827]" data-testid="text-resources-title">Resources</h1>
        {isStaffOrAdmin && (
          <Button size="sm" className="bg-[#0D9488] text-white" onClick={() => setShowForm(!showForm)} data-testid="button-add-resource">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 mb-4 space-y-3" data-testid="resource-form">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111827]">Add Resource</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-[#9CA3AF]" /></button>
          </div>
          <Input placeholder="Resource name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-resource-name" />
          <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[60px] resize-none" data-testid="input-resource-description" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={formData.pillar} onValueChange={(v) => setFormData({ ...formData, pillar: v })}>
              <SelectTrigger data-testid="select-pillar"><SelectValue placeholder="Pillar" /></SelectTrigger>
              <SelectContent>
                {["community", "confidence", "resilience", "readiness", "wellness"].map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger data-testid="select-type"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {["partner", "program", "service", "opportunity"].map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Provider name" value={formData.providerName} onChange={(e) => setFormData({ ...formData, providerName: e.target.value })} data-testid="input-provider-name" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Phone (optional)" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} data-testid="input-phone" />
            <Input placeholder="Website (optional)" value={formData.websiteUrl} onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })} data-testid="input-website" />
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
          <Button className="w-full bg-[#0D9488] text-white" onClick={() => createResource.mutate()} disabled={!formData.name || !formData.pillar || !formData.type || createResource.isPending} data-testid="button-save-resource">
            {createResource.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}

      {isStaffOrAdmin && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2" data-testid="stage-filters">
          {["all", "client", "alumni"].map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                stageFilter === s ? "bg-[#0D9488] text-white" : "bg-white text-[#6B7280]"
              }`}
              data-testid={`button-stage-${s}`}
            >
              {s === "all" ? "All" : s === "client" ? "Clients" : "Alumni"}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4" data-testid="pillar-filters">
        {pillars.map((p) => (
          <button
            key={p}
            onClick={() => setPillarFilter(p)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
              pillarFilter === p ? "bg-[#0D9488] text-white" : "bg-white text-[#6B7280]"
            }`}
            data-testid={`button-pillar-${p}`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>
      ) : (
        <div className="space-y-3">
          {resources?.map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl p-4" data-testid={`resource-card-${r.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pillarColors[r.pillar] || "#0D9488" }}>
                    {r.pillar}
                  </span>
                  <h3 className="text-sm font-semibold text-[#111827] mt-0.5">{r.name}</h3>
                  <p className="text-xs text-[#6B7280] mt-1 leading-relaxed line-clamp-3">{r.description}</p>
                  {r.providerName && (
                    <p className="text-xs text-[#9CA3AF] mt-1.5">{r.providerName}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {r.phone && (
                      <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-xs text-[#0D9488] font-medium" data-testid={`link-phone-${r.id}`}>
                        <Phone className="w-3 h-3" /> {r.phone}
                      </a>
                    )}
                    {r.websiteUrl && (
                      <a href={r.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#0D9488] font-medium" data-testid={`link-website-${r.id}`}>
                        <Globe className="w-3 h-3" /> Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
              {isStaffOrAdmin && (
                <div className="flex gap-1 mt-2">
                  {r.applicableStages?.map((s: string) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] font-medium">
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {resources?.length === 0 && (
            <div className="text-center py-8 text-sm text-[#9CA3AF]">No resources found.</div>
          )}
        </div>
      )}
    </div>
  );
}
