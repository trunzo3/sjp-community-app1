import { CommunityFeed } from "@/components/community-feed";

export default function CommunityPage() {
  return (
    <div>
      <h1 className="text-lg font-bold text-[#111827] mb-4" data-testid="text-community-title">Community</h1>
      <CommunityFeed showPrivacyBanner={true} />
    </div>
  );
}
