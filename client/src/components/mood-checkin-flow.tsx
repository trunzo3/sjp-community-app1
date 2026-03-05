import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MOOD_TAXONOMY, textOnColor, type CoreEmotion, type MidEmotion, type OuterEmotion } from "@/data/mood-taxonomy";
import { ArrowLeft, Lock, X } from "lucide-react";
import type { MoodCheckin } from "@shared/schema";

interface MoodCheckinFlowProps {
  onComplete: (checkin: MoodCheckin) => void;
  onClose: () => void;
}

export function MoodCheckinFlow({ onComplete, onClose }: MoodCheckinFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedCore, setSelectedCore] = useState<CoreEmotion | null>(null);
  const [selectedMid, setSelectedMid] = useState<MidEmotion | null>(null);
  const [selectedOuter, setSelectedOuter] = useState<OuterEmotion | null>(null);
  const [journalEntry, setJournalEntry] = useState("");
  const [showJournal, setShowJournal] = useState(false);
  const [savedCheckin, setSavedCheckin] = useState<MoodCheckin | null>(null);

  const activeColor = selectedOuter?.color || selectedMid?.color || selectedCore?.color || "#34737A";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mood", {
        coreEmotion: selectedCore!.label.toLowerCase(),
        midEmotion: selectedMid!.label.toLowerCase(),
        outerEmotion: selectedOuter!.label.toLowerCase().replace(/\s+/g, "_"),
        coreColor: selectedCore!.color,
        midColor: selectedMid!.color,
        outerColor: selectedOuter!.color,
        outerLabel: selectedOuter!.label,
        journalEntry: journalEntry.trim() || null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/history"] });
      setSavedCheckin(data);
      setStep(4);
    },
  });

  const handleBack = () => {
    if (step === 1) { setSelectedCore(null); setStep(0); }
    else if (step === 2) { setSelectedMid(null); setStep(1); }
    else if (step === 3) { setSelectedOuter(null); setStep(2); }
  };

  const progressDots = (
    <div className="flex items-center justify-center gap-2 mt-3 mb-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-all duration-300"
          style={{
            backgroundColor: i <= step
              ? (step === 0 ? ["#3B82F6", "#FACC15", "#8B5CF6", "#EF4444"][i] || "#22C55E" : activeColor)
              : "#E5E1DE",
            transform: i === step ? "scale(1.3)" : "scale(1)",
          }}
          data-testid={`progress-dot-${i}`}
        />
      ))}
    </div>
  );

  const header = (
    <div className="flex items-center justify-between px-1 pt-2 pb-1">
      <div className="w-10">
        {step > 0 && step < 4 && (
          <button onClick={handleBack} className="p-1" data-testid="button-back-mood" style={{ color: activeColor }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#F5F3F1]">
        <Lock className="w-3 h-3 text-[#868180]" />
        <span className="text-[10px] font-medium text-[#868180]">Private · Only You</span>
      </div>
      <div className="w-10 flex justify-end">
        {step < 4 && (
          <button onClick={onClose} className="p-1 text-[#868180]" data-testid="button-close-mood">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  if (step === 4 && savedCheckin) {
    return (
      <div className="animate-in fade-in duration-300">
        {header}
        <div className="px-2 py-4 text-center space-y-5">
          <div
            className="rounded-2xl p-6 mx-auto max-w-sm shadow-md"
            style={{ backgroundColor: selectedOuter!.color }}
            data-testid="mood-confirmation-card"
          >
            <p className="text-lg font-semibold mb-3" style={{ color: textOnColor(selectedOuter!.color) }}>
              {selectedOuter!.label}
            </p>
            <div className="flex items-center justify-center gap-2 mb-3">
              {[selectedCore!.color, selectedMid!.color, selectedOuter!.color].map((c, i) => (
                <div key={i} className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: c }} />
              ))}
            </div>
            {savedCheckin.journalEntry && (
              <p className="text-sm mt-3 opacity-90 italic" style={{ color: textOnColor(selectedOuter!.color) }}>
                "{savedCheckin.journalEntry}"
              </p>
            )}
          </div>
          <p className="text-xs text-[#868180] italic">This is yours. Nobody else sees it.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setStep(0);
                setSelectedCore(null);
                setSelectedMid(null);
                setSelectedOuter(null);
                setJournalEntry("");
                setShowJournal(false);
                setSavedCheckin(null);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-[#E5E1DE] text-[#302D2E]"
              data-testid="button-new-checkin"
            >
              New Check-In
            </button>
            <button
              onClick={() => onComplete(savedCheckin)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: activeColor }}
              data-testid="button-view-my-colors"
            >
              View My Colors
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="animate-in fade-in duration-300">
        {header}
        {progressDots}
        <div className="px-2">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: selectedCore!.color, color: textOnColor(selectedCore!.color) }}
            >
              {selectedCore!.label}
            </span>
            <span className="text-[#C7C2BF]">›</span>
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: selectedMid!.color, color: textOnColor(selectedMid!.color) }}
            >
              {selectedMid!.label}
            </span>
            <span className="text-[#C7C2BF]">›</span>
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: selectedOuter!.color, color: textOnColor(selectedOuter!.color) }}
            >
              {selectedOuter!.label}
            </span>
          </div>

          <div
            className="rounded-2xl p-5 mb-4 shadow-sm"
            style={{ backgroundColor: selectedOuter!.color }}
            data-testid="mood-summary-card"
          >
            <p className="text-base font-semibold mb-2" style={{ color: textOnColor(selectedOuter!.color) }}>
              Today you're feeling {selectedOuter!.label}
            </p>
            <div className="flex items-center gap-2">
              {[selectedCore!.color, selectedMid!.color, selectedOuter!.color].map((c, i) => (
                <div key={i} className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {!showJournal ? (
            <button
              onClick={() => setShowJournal(true)}
              className="w-full border-2 border-dashed border-[#E5E1DE] rounded-xl py-3 text-sm text-[#868180] mb-4 hover:border-[#C7C2BF] transition-colors"
              data-testid="button-journal-prompt"
            >
              Want to say more? Tap to write…
            </button>
          ) : (
            <textarea
              value={journalEntry}
              onChange={(e) => setJournalEntry(e.target.value)}
              placeholder="Whatever's on your mind. This is just for you."
              className="w-full border border-[#E5E1DE] rounded-xl p-3 text-sm resize-none min-h-[100px] mb-4 focus:outline-none focus:border-[#C7C2BF] bg-white"
              autoFocus
              data-testid="input-journal-entry"
            />
          )}

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full py-3 rounded-xl text-sm font-semibold shadow-sm transition-opacity disabled:opacity-50"
            style={{ backgroundColor: selectedOuter!.color, color: textOnColor(selectedOuter!.color) }}
            data-testid="button-save-mood"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
          <p className="text-center text-xs text-[#C7C2BF] mt-2">No journal needed — just tap Save</p>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="animate-in fade-in duration-300">
        {header}
        {progressDots}
        <div className="px-2">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: selectedCore!.color, color: textOnColor(selectedCore!.color) }}
            >
              {selectedCore!.label}
            </span>
            <span className="text-[#C7C2BF]">›</span>
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: selectedMid!.color, color: textOnColor(selectedMid!.color) }}
            >
              {selectedMid!.label}
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#302D2E] mb-3">More specifically…</h2>
          <div className="space-y-2">
            {selectedMid!.outer.map((outer) => (
              <button
                key={outer.label}
                onClick={() => { setSelectedOuter(outer); setStep(3); }}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
                style={{ borderLeft: `4px solid ${outer.color}` }}
                data-testid={`button-outer-${outer.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: outer.color }} />
                <span className="text-sm font-medium" style={{ color: outer.color }}>{outer.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="animate-in fade-in duration-300">
        {header}
        {progressDots}
        <div className="px-2">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: selectedCore!.color, color: textOnColor(selectedCore!.color) }}
            >
              {selectedCore!.label}
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#302D2E] mb-3">A bit more…</h2>
          <div className="grid grid-cols-2 gap-3">
            {selectedCore!.mid.map((mid) => (
              <button
                key={mid.label}
                onClick={() => { setSelectedMid(mid); setStep(2); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
                data-testid={`button-mid-${mid.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-10 h-10 rounded-full" style={{ backgroundColor: mid.color }} />
                <span className="text-sm font-semibold" style={{ color: mid.color }}>{mid.label}</span>
                <span className="text-[10px] text-[#868180] text-center leading-tight">
                  {mid.outer.map(o => o.label).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      {header}
      {progressDots}
      <div className="px-2">
        <h2 className="text-lg font-bold text-[#302D2E] mb-1">How are you feeling?</h2>
        <p className="text-sm text-[#868180] mb-4">Start with what's closest</p>
        <div className="space-y-3">
          {MOOD_TAXONOMY.map((core) => (
            <button
              key={core.label}
              onClick={() => { setSelectedCore(core); setStep(1); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
              data-testid={`button-core-${core.label.toLowerCase()}`}
            >
              <div className="w-12 h-12 rounded-full shrink-0" style={{ backgroundColor: core.color }} />
              <div className="text-left">
                <span className="text-base font-semibold block" style={{ color: core.color }}>{core.label}</span>
                <span className="text-[11px] text-[#868180]">
                  {core.mid.map(m => m.label).join(" · ")}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
