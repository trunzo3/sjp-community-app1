import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Pencil } from "lucide-react";
import { useLocation } from "wouter";

const steps = [
  {
    title: "Where were you?",
    prompt: "Tell us about where you were before Saint John's. What was life like?",
    hints: ["I was sleeping in my car...", "I didn't think I'd ever..."],
    placeholder: "Write freely. There's no wrong way to tell your story.",
  },
  {
    title: "What changed?",
    prompt: "What happened at Saint John's that made a difference?",
    hints: ["The moment things started to shift was...", "The person who changed everything for me..."],
    placeholder: "Write freely. There's no wrong way to tell your story.",
  },
  {
    title: "Where are you now?",
    prompt: "Tell us about your life today.",
    hints: ["Today I wake up and...", "My kids and I..."],
    placeholder: "Write freely. There's no wrong way to tell your story.",
  },
];

export default function ShareStoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [contents, setContents] = useState(["", "", ""]);
  const [shareExternally, setShareExternally] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [editingRevision, setEditingRevision] = useState(false);

  const { data: myStories } = useQuery<any[]>({
    queryKey: ["/api/stories/user", user?.id || ""],
    enabled: !!user?.id,
  });

  const revisionStory = myStories?.find((s: any) => s.approvalStatus === "revision_requested");

  function startEditingRevision() {
    if (!revisionStory) return;
    setContents([
      revisionStory.step1Content || "",
      revisionStory.step2Content || "",
      revisionStory.step3Content || "",
    ]);
    setShareExternally(revisionStory.shareExternally || false);
    setEditingRevision(true);
    setStep(0);
  }

  const submitStory = useMutation({
    mutationFn: async () => {
      if (editingRevision && revisionStory) {
        await apiRequest("PATCH", `/api/stories/${revisionStory.id}/resubmit`, {
          step1Content: contents[0],
          step2Content: contents[1],
          step3Content: contents[2],
          shareExternally,
        });
      } else {
        await apiRequest("POST", "/api/stories", {
          step1Content: contents[0],
          step2Content: contents[1],
          step3Content: contents[2],
          shareExternally,
          approvalStatus: shareExternally ? "pending" : "community_only",
          featured: false,
        });
      }
    },
    onSuccess: () => {
      setSubmitted(true);
      setEditingRevision(false);
      queryClient.invalidateQueries({ queryKey: ["/api/stories/featured"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/user", user?.id || ""] });
    },
  });

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="story-confirmation">
        <div className="w-16 h-16 rounded-full bg-[#34737A]/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#34737A]" />
        </div>
        <h1 className="text-xl font-bold text-[#302D2E] mb-2">
          {editingRevision ? "Story resubmitted!" : "Thank you for sharing your story."}
        </h1>
        <p className="text-sm text-[#868180] max-w-xs">
          {shareExternally
            ? "A staff member will review your story before it's shared outside the community."
            : "Your story is now visible to the SJP community."}
        </p>
        <Button className="bg-[#34737A] text-white mt-6" onClick={() => navigate("/")} data-testid="button-return-home">
          Return Home
        </Button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep(2)} data-testid="button-back-step3">
            <ArrowLeft className="w-5 h-5 text-[#868180]" />
          </button>
          <h1 className="text-lg font-bold text-[#302D2E]">Sharing Permission</h1>
        </div>

        <div className="bg-white rounded-xl p-5 space-y-4" data-testid="sharing-permission">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-[#302D2E] flex-1">
              Allow Saint John's to share my story at fundraising and outreach events
            </p>
            <Switch checked={shareExternally} onCheckedChange={setShareExternally} data-testid="toggle-share-externally" />
          </div>
          <p className="text-xs text-[#868180] leading-relaxed">
            If you say yes, a staff member will review your story before it's shared outside the community. Your story will always be visible in the SJP community regardless of this setting.
          </p>
        </div>

        <Button
          className="w-full bg-[#34737A] text-white mt-6"
          onClick={() => submitStory.mutate()}
          disabled={submitStory.isPending}
          data-testid="button-submit-story"
        >
          {submitStory.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {editingRevision ? "Resubmit" : "Submit"}
        </Button>
      </div>
    );
  }

  const currentStep = steps[step];
  const currentContent = contents[step];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => {
          if (step > 0) setStep(step - 1);
          else { setEditingRevision(false); navigate("/profile"); }
        }} data-testid="button-back-story">
          <ArrowLeft className="w-5 h-5 text-[#868180]" />
        </button>
        <h1 className="text-lg font-bold text-[#302D2E]">
          {editingRevision ? "Edit Your Story" : "Share Your Story"}
        </h1>
      </div>

      {revisionStory && !editingRevision && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4" data-testid="revision-banner">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">Revision requested on your story</p>
              {revisionStory.revisionNote && (
                <p className="text-xs text-orange-700 mt-1 leading-relaxed">{revisionStory.revisionNote}</p>
              )}
              <Button
                size="sm"
                className="bg-orange-500 text-white mt-3"
                onClick={startEditingRevision}
                data-testid="button-edit-revision"
              >
                <Pencil className="w-3 h-3 mr-1" /> Edit & Resubmit
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6" data-testid="progress-bar">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#868180]">Step {step + 1} of 3</span>
        </div>
        <div className="h-1.5 bg-[#C7C2BF] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#34737A] rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 space-y-4" data-testid={`story-step-${step + 1}`}>
        <h2 className="text-base font-bold text-[#302D2E]">{currentStep.title}</h2>
        <p className="text-sm text-[#868180]">{currentStep.prompt}</p>

        {!focused && !currentContent && (
          <div className="space-y-1">
            {currentStep.hints.map((hint, i) => (
              <p key={i} className="text-xs text-[#C7C2BF] italic">"{hint}"</p>
            ))}
          </div>
        )}

        <Textarea
          value={currentContent}
          onChange={(e) => {
            const updated = [...contents];
            updated[step] = e.target.value;
            setContents(updated);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={currentStep.placeholder}
          className="min-h-[160px] resize-none text-sm"
          data-testid="input-story-content"
        />
      </div>

      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)} data-testid="button-story-back">
            Back
          </Button>
        )}
        <Button
          className={`bg-[#34737A] text-white ${step === 0 ? "w-full" : "flex-1"}`}
          onClick={() => setStep(step + 1)}
          disabled={!currentContent.trim()}
          data-testid="button-story-continue"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
