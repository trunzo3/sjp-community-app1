import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

function getDueSurveyInterval(graduationDate: string | null, completedIntervals: number[]): number | null {
  if (!graduationDate) return null;
  const gradTime = new Date(graduationDate + "T00:00:00").getTime();
  const now = Date.now();
  const daysSinceGrad = (now - gradTime) / (1000 * 60 * 60 * 24);

  const intervals = [
    { months: 3, days: 90 },
    { months: 6, days: 180 },
    { months: 12, days: 365 },
  ];

  for (const { months, days } of intervals) {
    if (daysSinceGrad >= days && !completedIntervals.includes(months)) {
      return months;
    }
  }
  return null;
}

export default function SurveyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [submitted, setSubmitted] = useState(false);

  const [stillEmployed, setStillEmployed] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [raiseOrPromotion, setRaiseOrPromotion] = useState(false);
  const [promotionDetails, setPromotionDetails] = useState("");
  const [housingStatus, setHousingStatus] = useState("");
  const [supportNeeds, setSupportNeeds] = useState("");

  const { data: existingSurveys } = useQuery<any[]>({
    queryKey: ["/api/surveys/user", user?.id || ""],
    enabled: !!user?.id,
  });

  const completedIntervals = existingSurveys?.map((s: any) => s.intervalMonths) || [];
  const dueInterval = getDueSurveyInterval(user?.graduationDate || null, completedIntervals);

  const submitSurvey = useMutation({
    mutationFn: async () => {
      if (!dueInterval) throw new Error("No survey due");
      await apiRequest("POST", "/api/surveys", {
        intervalMonths: dueInterval,
        stillEmployed,
        jobTitle: jobTitle || null,
        raiseOrPromotion,
        promotionDetails: raiseOrPromotion ? promotionDetails : null,
        housingStatus: housingStatus || null,
        supportNeeds: supportNeeds || null,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/surveys/user", user?.id || ""] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surveys"] });
    },
  });

  if (!dueInterval && !submitted && existingSurveys !== undefined) {
    navigate("/");
    return null;
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="survey-confirmation">
        <div className="w-16 h-16 rounded-full bg-[#0D9488]/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#0D9488]" />
        </div>
        <h1 className="text-xl font-bold text-[#111827] mb-2">Thank you for checking in!</h1>
        <p className="text-sm text-[#6B7280] max-w-xs">
          Your responses help us serve the community better.
        </p>
        <Button className="bg-[#0D9488] text-white mt-6" onClick={() => navigate("/")} data-testid="button-survey-return-home">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("/")} data-testid="button-back-survey">
          <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <h1 className="text-lg font-bold text-[#111827]" data-testid="text-survey-title">
          {dueInterval}-Month Check-in
        </h1>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 space-y-3" data-testid="survey-form">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[#111827]">Are you still employed?</label>
              <Switch checked={stillEmployed} onCheckedChange={setStillEmployed} data-testid="toggle-employed" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#111827] block mb-1">Current job title</label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={stillEmployed ? "Your current position" : "Optional"}
              data-testid="input-job-title"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[#111827]">Have you received a raise or promotion?</label>
              <Switch checked={raiseOrPromotion} onCheckedChange={setRaiseOrPromotion} data-testid="toggle-raise" />
            </div>
          </div>

          {raiseOrPromotion && (
            <div>
              <label className="text-sm font-medium text-[#111827] block mb-1">Details</label>
              <Input
                value={promotionDetails}
                onChange={(e) => setPromotionDetails(e.target.value)}
                placeholder="Tell us more about your raise or promotion"
                data-testid="input-promotion-details"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-[#111827] block mb-1">Housing status</label>
            <Select value={housingStatus} onValueChange={setHousingStatus}>
              <SelectTrigger data-testid="select-housing-status"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="transitional">Transitional</SelectItem>
                <SelectItem value="unstable">Unstable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#111827] block mb-1">What support do you need right now?</label>
            <Textarea
              value={supportNeeds}
              onChange={(e) => setSupportNeeds(e.target.value)}
              placeholder="Let us know how we can help"
              className="min-h-[80px] resize-none"
              data-testid="input-support-needs"
            />
          </div>
        </div>

        <Button
          className="w-full bg-[#0D9488] text-white"
          onClick={() => submitSurvey.mutate()}
          disabled={!housingStatus || submitSurvey.isPending}
          data-testid="button-submit-survey"
        >
          {submitSurvey.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Submit
        </Button>
      </div>
    </div>
  );
}

export { getDueSurveyInterval };
