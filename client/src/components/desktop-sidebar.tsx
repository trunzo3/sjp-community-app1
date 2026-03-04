import { useLocation, Link } from "wouter";
import { Home, Users, BookOpen, Calendar, User, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import sjpLogo from "@assets/FF_SJP_Logos_Digital_Primary_SJP_FullColorWhiteText_1772578179749.png";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/community", label: "Community", icon: Users },
  { path: "/resources", label: "Resources", icon: BookOpen },
  { path: "/events", label: "Events", icon: Calendar },
  { path: "/profile", label: "Profile", icon: User },
];

export function DesktopSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-[240px] bg-white border-r border-[#F1EFEF] z-40 flex flex-col"
      data-testid="desktop-sidebar"
    >
      <div className="p-5 pb-3">
        <div className="rounded-xl overflow-hidden mb-3" style={{ background: "linear-gradient(135deg, #34737A 0%, #2C6169 50%, #1F4F49 100%)" }}>
          <div className="px-4 py-3 flex items-center gap-3">
            <img src={sjpLogo} alt="SJP" className="h-8 w-auto" />
          </div>
        </div>
        <p className="text-[10px] text-[#C7C2BF] font-medium tracking-wider uppercase">Navigation</p>
      </div>

      <nav className="flex-1 px-3 space-y-1" data-testid="desktop-nav">
        {tabs.map((tab) => {
          const active = location === tab.path || (tab.path !== "/" && location.startsWith(tab.path));
          const isHome = tab.path === "/" && location === "/";
          const isActive = isHome || active;
          return (
            <Link key={tab.path} href={tab.path}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isActive
                    ? "bg-[#34737A]/10 text-[#34737A]"
                    : "text-[#868180] hover:bg-[#F1EFEF] hover:text-[#302D2E]"
                }`}
                data-testid={`sidebar-nav-${tab.label.toLowerCase()}`}
              >
                <tab.icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            </Link>
          );
        })}

        {isStaffOrAdmin && (
          <Link href="/admin">
            <button
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                location.startsWith("/admin")
                  ? "bg-[#34737A]/10 text-[#34737A]"
                  : "text-[#868180] hover:bg-[#F1EFEF] hover:text-[#302D2E]"
              }`}
              data-testid="sidebar-nav-admin"
            >
              <Shield className="w-5 h-5 shrink-0" strokeWidth={2} />
              <span className="text-sm font-medium">Admin Panel</span>
            </button>
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-[#F1EFEF]">
        <p className="text-[10px] text-[#C7C2BF] italic">Saint John's Program for Real Change</p>
      </div>
    </aside>
  );
}
