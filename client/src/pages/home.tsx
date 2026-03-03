import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { CommunityFeed } from "@/components/community-feed";
import { AvatarCircle } from "@/components/avatar-circle";
import { ChevronLeft, ChevronRight, Sparkles, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { getDueSurveyInterval } from "@/pages/survey";

type StoryWithAuthor = {
  id: string;
  authorId: string;
  step1Content: string | null;
  step2Content: string | null;
  step3Content: string | null;
  featured: boolean;
  author: { firstName: string; avatarColor: string };
};

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [storyIndex, setStoryIndex] = useState(0);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);

  const { data: stories } = useQuery<StoryWithAuthor[]>({ queryKey: ["/api/stories/featured"] });
  const { data: events } = useQuery<any[]>({ queryKey: ["/api/events"] });
  const { data: existingSurveys } = useQuery<any[]>({
    queryKey: ["/api/surveys/user", user?.id || ""],
    enabled: !!user?.id && user?.role === "alumni",
  });

  const nextEvent = events?.[0];
  const isAlumni = user?.role === "alumni";

  const completedIntervals = existingSurveys?.map((s: any) => s.intervalMonths) || [];
  const dueInterval = getDueSurveyInterval(user?.graduationDate || null, completedIntervals);

  return (
    <div className="space-y-4">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #34737A 0%, #2C6169 50%, #1F4F49 100%)" }}
        data-testid="hero-banner"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.2) 0%, transparent 60%)" }} />
        </div>
        <div className="relative px-5 py-6">
          <p className="text-white/70 text-xs font-medium tracking-wider uppercase mb-1">SJP Community</p>
          <h1 className="text-xl font-bold text-white" data-testid="text-greeting">
            Welcome back, {user?.firstName}.
          </h1>
          <p className="text-white/70 text-sm mt-2 leading-relaxed">
            You're here not because you're broken, but because you're strong.
          </p>
          <p className="text-white/40 text-xs mt-3 font-medium">Building community. Changing lives.</p>
        </div>
      </div>

      {stories && stories.length > 0 && (
        <div data-testid="stories-carousel">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-[#302D2E]">Stories of Change</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setStoryIndex(Math.max(0, storyIndex - 1))}
                className="p-1 rounded-full text-[#868180] hover:bg-[#F1EFEF] transition-colors disabled:opacity-30"
                disabled={storyIndex === 0}
                data-testid="button-story-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setStoryIndex(Math.min((stories?.length || 1) - 1, storyIndex + 1))}
                className="p-1 rounded-full text-[#868180] hover:bg-[#F1EFEF] transition-colors disabled:opacity-30"
                disabled={storyIndex >= (stories?.length || 1) - 1}
                data-testid="button-story-next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300"
              style={{ transform: `translateX(-${storyIndex * 100}%)` }}
            >
              {stories.map((story) => (
                <div key={story.id} className="w-full shrink-0 pr-2">
                  <div className="bg-white rounded-xl p-4" data-testid={`story-card-${story.id}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AvatarCircle firstName={story.author.firstName} color={story.author.avatarColor} size="sm" />
                      <div>
                        <span className="text-sm font-semibold text-[#302D2E]">{story.author.firstName}</span>
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#34737A]" />
                          <span className="text-[10px] font-medium text-[#34737A]">Featured Story</span>
                        </div>
                      </div>
                    </div>
                    {expandedStory === story.id ? (
                      <div className="space-y-3 mt-2">
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
                        <button
                          onClick={() => setExpandedStory(null)}
                          className="text-xs font-medium text-[#34737A]"
                          data-testid={`button-collapse-story-${story.id}`}
                        >
                          Show less
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-[#868180] line-clamp-2 leading-relaxed">{story.step3Content}</p>
                        <button
                          onClick={() => setExpandedStory(story.id)}
                          className="text-xs font-medium text-[#34737A] mt-1"
                          data-testid={`button-read-story-${story.id}`}
                        >
                          Read more
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-1.5 mt-2">
            {stories.map((_, i) => (
              <button
                key={i}
                onClick={() => setStoryIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === storyIndex ? "bg-[#34737A]" : "bg-[#C7C2BF]"}`}
                data-testid={`button-story-dot-${i}`}
              />
            ))}
          </div>
        </div>
      )}

      {isAlumni && (
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "linear-gradient(135deg, #34737A, #2C6169)" }}
          data-testid="share-story-bar"
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white">Share your story</h3>
            <p className="text-xs text-white/70 mt-0.5">Your journey can inspire someone who's just starting</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/20 border-white/30 text-white shrink-0 backdrop-blur-sm"
            onClick={() => navigate("/share-story")}
            data-testid="button-write-story"
          >
            Write it
          </Button>
        </div>
      )}

      <CommunityFeed />

      {nextEvent && (
        <div className="bg-white rounded-xl p-4" data-testid="next-event-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#34737A]" />
            <span className="text-xs font-bold text-[#868180] uppercase tracking-wider">Next Event</span>
          </div>
          <h3 className="text-sm font-semibold text-[#302D2E]">{nextEvent.name}</h3>
          <p className="text-xs text-[#868180] mt-1">
            {format(new Date(nextEvent.date + "T00:00:00"), "EEEE, MMM d")} at {nextEvent.startTime?.slice(0, 5)} - {nextEvent.location}
          </p>
        </div>
      )}

      {isAlumni && dueInterval && (
        <div className="bg-[#FEF3C7] rounded-xl p-4" data-testid="survey-card">
          <p className="text-sm font-semibold text-[#92400E]">
            It's time for your {dueInterval}-month check-in!
          </p>
          <p className="text-xs text-[#B45309] mt-0.5">
            Your feedback helps Saint John's continue to improve.
          </p>
          <Button
            size="sm"
            className="bg-[#92400E] text-white mt-3"
            onClick={() => navigate("/survey")}
            data-testid="button-take-survey"
          >
            Take Survey <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
