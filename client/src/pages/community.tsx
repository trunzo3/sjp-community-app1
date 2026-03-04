import { CommunityFeed } from "@/components/community-feed";

export default function CommunityPage() {
  return (
    <div className="max-w-[600px] md:mx-0">
      <div className="h-[3px] bg-[#34737A] -mx-4 md:mx-0 md:rounded-full mb-4" />
      <h1 className="text-lg font-bold text-[#302D2E] mb-4" data-testid="text-community-title">Community</h1>
      <CommunityFeed showPrivacyBanner={true} />
    </div>
  );
}
