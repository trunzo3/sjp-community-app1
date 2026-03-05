import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { AvatarCircle } from "@/components/avatar-circle";
import { PostCard } from "@/components/post-card";
import { BookOpen, Calendar, MessageCircle, ArrowRight, CornerDownLeft, Heart } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { getDueSurveyInterval } from "@/pages/survey";
import { DailyAffirmation } from "@/components/daily-affirmation";
import { StreakAcknowledgment } from "@/components/streak-acknowledgment";
import { useIsMobile } from "@/hooks/use-mobile";

type StoryWithAuthor = {
  id: string;
  authorId: string;
  step1Content: string | null;
  step2Content: string | null;
  step3Content: string | null;
  featured: boolean;
  author: { firstName: string; avatarColor: string };
};

const postTypeColors: Record<string, { dot: string; label: string; bg: string }> = {
  need: { dot: "#D32027", label: "#D32027", bg: "#FBEAEA" },
  win: { dot: "#5DA592", label: "#5DA592", bg: "#E6F2EF" },
  question: { dot: "#979DB6", label: "#979DB6", bg: "#EDEEF3" },
  update: { dot: "#34737A", label: "#34737A", bg: "#E8F0F1" },
};

const seeMoreFilterMap: Record<string, string> = {
  need: "need",
  win: "win",
  question: "question",
  update: "",
};

function HomeCategoryCard({ post }: { post: any }) {
  const [, navigate] = useLocation();
  const colors = postTypeColors[post.postType] || postTypeColors.update;
  const { data: reactions } = useQuery<any[]>({
    queryKey: ["/api/reactions", post.id],
  });
  const reactionCount = reactions?.length || 0;
  const replyCount = post.replies?.length || 0;

  const seeMoreFilter = seeMoreFilterMap[post.postType] ?? "";
  const seeMoreHref = seeMoreFilter ? `/community?filter=${seeMoreFilter}` : "/community";

  return (
    <div className="bg-white rounded-xl overflow-hidden" data-testid={`home-post-${post.id}`}>
      <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: colors.bg }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.label }}>
            {post.postType}
          </span>
        </div>
        <button
          onClick={() => navigate(seeMoreHref)}
          className="text-[10px] font-medium flex items-center gap-0.5"
          style={{ color: colors.label }}
          data-testid={`link-see-more-${post.postType}`}
        >
          See more <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AvatarCircle firstName={post.author.firstName} color={post.author.avatarColor} size="sm" photoUrl={post.author.photoUrl} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-[#302D2E]">{post.author.firstName}</span>
            <p className="text-sm text-[#302D2E] mt-1 leading-relaxed">{post.content}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-[#E8956D] flex items-center gap-1 font-medium">
                <Heart className="w-3 h-3" fill="#E8956D" /> {reactionCount > 0 ? reactionCount : ""}
              </span>
              <span className="text-xs text-[#868180] flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" />
                {replyCount} {replyCount === 1 ? "Reply" : "Replies"}
              </span>
              <span className="text-[10px] text-[#C7C2BF] ml-auto">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, color, linkText, onLink }: {
  icon: React.ReactNode;
  title: string;
  color: string;
  linkText: string;
  onLink: () => void;
}) {
  return (
    <div className="pb-2" style={{ borderBottom: `2px solid ${color}26` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-bold" style={{ color }}>{title}</span>
        </div>
        <button
          onClick={onLink}
          className="text-xs font-medium flex items-center gap-0.5"
          style={{ color }}
          data-testid={`link-${title.toLowerCase().replace(/\s/g, "-")}`}
        >
          {linkText} <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [eventExpanded, setEventExpanded] = useState(false);
  const isMobile = useIsMobile();

  const { data: stories } = useQuery<StoryWithAuthor[]>({ queryKey: ["/api/stories/featured"] });
  const { data: events } = useQuery<any[]>({ queryKey: ["/api/events"] });
  const { data: allPosts } = useQuery<any[]>({ queryKey: ["/api/posts", "?filter=all"] });
  const { data: existingSurveys } = useQuery<any[]>({
    queryKey: ["/api/surveys/user", user?.id || ""],
    enabled: !!user?.id && user?.role === "alumni",
  });

  const nextEvent = events?.[0];
  const isAlumni = user?.role === "alumni";
  const featuredStory = stories?.[0];

  const completedIntervals = existingSurveys?.map((s: any) => s.intervalMonths) || [];
  const dueInterval = getDueSurveyInterval(user?.graduationDate || null, completedIntervals);

  const pinnedPosts = allPosts?.filter((p: any) => p.pinned) || [];
  const nonPinnedPosts = allPosts?.filter((p: any) => !p.pinned) || [];

  const latestByType: Record<string, any> = {};
  for (const type of ["need", "win", "question", "update"]) {
    const found = nonPinnedPosts.find((p: any) => p.postType === type);
    if (found) latestByType[type] = found;
  }
  const categoryPosts = ["need", "win", "question", "update"]
    .filter((t) => latestByType[t])
    .map((t) => latestByType[t]);

  const storiesAndEventSection = (
    <>
      {featuredStory && (
        <div data-testid="stories-section">
          <SectionHeader
            icon={<BookOpen className="w-4 h-4" style={{ color: "#D32027" }} />}
            title="Stories of Change"
            color="#D32027"
            linkText="Read more"
            onLink={() => navigate("/share-story")}
          />
          <div className="mt-3 bg-[#FAE8DF] rounded-xl p-5" data-testid="featured-story-card">
            <span className="text-4xl leading-none font-serif text-[#EEBBA7] block mb-1">{"\u201C\u201C"}</span>
            <p className="text-sm italic text-[#302D2E] leading-relaxed" data-testid="text-featured-story">
              {featuredStory.step3Content}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <AvatarCircle firstName={featuredStory.author.firstName} color={featuredStory.author.avatarColor} size="sm" photoUrl={featuredStory.author.photoUrl} />
              <span className="text-xs font-semibold text-[#302D2E]">{featuredStory.author.firstName}</span>
              <span className="text-xs font-medium text-[#34737A]">Alumni</span>
            </div>
          </div>
        </div>
      )}

      {nextEvent && (
        <div data-testid="next-event-section">
          <SectionHeader
            icon={<Calendar className="w-4 h-4" style={{ color: "#34737A" }} />}
            title="Next Event"
            color="#34737A"
            linkText="See all"
            onLink={() => navigate("/events")}
          />
          <div className="mt-3">
            <EventCard
              event={nextEvent}
              expanded={eventExpanded}
              onToggle={() => setEventExpanded(!eventExpanded)}
            />
          </div>
        </div>
      )}
    </>
  );

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
          <p className="text-white/40 text-xs mt-3 font-medium">Building community. Changing lives.</p>
        </div>
      </div>

      <StreakAcknowledgment />

      <DailyAffirmation />

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

      {!isMobile ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            {storiesAndEventSection}
          </div>
          <div className="space-y-4" data-testid="community-feed-section">
            <SectionHeader
              icon={<MessageCircle className="w-4 h-4" style={{ color: "#B8876F" }} />}
              title="Community Feed"
              color="#B8876F"
              linkText="See all"
              onLink={() => navigate("/community")}
            />
            <div className="space-y-3">
              <button
                onClick={() => navigate("/community")}
                className="w-full flex items-center gap-3 bg-white rounded-full px-4 py-3 border border-[#F1EFEF] text-left"
                style={{ borderRadius: "20px" }}
                data-testid="slim-composer"
              >
                {user && <AvatarCircle firstName={user.firstName} color={user.avatarColor || "#607D8B"} size="sm" photoUrl={user.photoUrl} />}
                <span className="text-sm text-[#C7C2BF]">Share something with the community...</span>
              </button>
              {pinnedPosts.map((post: any) => (
                <PostCard key={post.id} post={post} isPinnedSection />
              ))}
              {categoryPosts.map((post: any) => (
                <HomeCategoryCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {storiesAndEventSection}

          <div data-testid="community-feed-section">
            <SectionHeader
              icon={<MessageCircle className="w-4 h-4" style={{ color: "#B8876F" }} />}
              title="Community Feed"
              color="#B8876F"
              linkText="See all"
              onLink={() => navigate("/community")}
            />
            <div className="mt-3 space-y-3">
              <button
                onClick={() => navigate("/community")}
                className="w-full flex items-center gap-3 bg-white rounded-full px-4 py-3 border border-[#F1EFEF] text-left"
                style={{ borderRadius: "20px" }}
                data-testid="slim-composer"
              >
                {user && <AvatarCircle firstName={user.firstName} color={user.avatarColor || "#607D8B"} size="sm" photoUrl={user.photoUrl} />}
                <span className="text-sm text-[#C7C2BF]">Share something with the community...</span>
              </button>
              {pinnedPosts.map((post: any) => (
                <PostCard key={post.id} post={post} isPinnedSection />
              ))}
              {categoryPosts.map((post: any) => (
                <HomeCategoryCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
