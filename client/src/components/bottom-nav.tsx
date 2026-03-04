import { useLocation, Link } from "wouter";
import { Home, Users, BookOpen, Calendar, User } from "lucide-react";

const tabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/community", label: "Community", icon: Users },
  { path: "/resources", label: "Resources", icon: BookOpen },
  { path: "/events", label: "Events", icon: Calendar },
  { path: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#C7C2BF] z-50"
      style={{ height: 64 }}
      data-testid="bottom-nav"
    >
      <div className="max-w-[430px] mx-auto h-full flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const active = location === tab.path || (tab.path !== "/" && location.startsWith(tab.path));
          const isHome = tab.path === "/" && location === "/";
          const isActive = isHome || active;
          return (
            <Link key={tab.path} href={tab.path}>
              <button
                className={`flex flex-col items-center justify-center gap-1 py-1 px-3 transition-colors ${
                  isActive ? "text-[#34737A]" : "text-[#D32027] hover:text-[#34737A]"
                }`}
                data-testid={`nav-${tab.label.toLowerCase()}`}
              >
                <tab.icon className="w-[22px] h-[22px]" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
