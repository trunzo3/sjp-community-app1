import { CommunityFeed } from "@/components/community-feed";

export default function CommunityPage() {
  return (
    <div>
      <div className="h-[3px] bg-[#34737A] -mx-4 mb-4" />
      <h1 className="text-lg font-bold text-[#302D2E] mb-4" data-testid="text-community-title">Community</h1>
      <CommunityFeed showPrivacyBanner={true} />
    </div>
  );
}
