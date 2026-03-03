import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const demoUsers = {
  CLIENTS: [
    { name: "Angela", email: "angela@sjp.demo", color: "#4CAF50", label: "Client" },
    { name: "Keisha", email: "keisha@sjp.demo", color: "#FF9800", label: "Client" },
    { name: "Destiny", email: "destiny@sjp.demo", color: "#2196F3", label: "Client" },
    { name: "Maria", email: "maria@sjp.demo", color: "#9C27B0", label: "Client" },
  ],
  ALUMNI: [
    { name: "Monica", email: "monica@sjp.demo", color: "#E91E63", label: "Alumni" },
    { name: "Tasha", email: "tasha@sjp.demo", color: "#00BCD4", label: "Alumni" },
    { name: "Denise", email: "denise@sjp.demo", color: "#FF5722", label: "Alumni" },
  ],
  STAFF: [
    { name: "Sarah", email: "sarah@sjp.demo", color: "#607D8B", label: "Staff" },
    { name: "James", email: "james@sjp.demo", color: "#795548", label: "Staff" },
    { name: "Broc", email: "broc@sjp.demo", color: "#3F51B5", label: "Staff" },
  ],
  ADMIN: [
    { name: "Scott", email: "scott@sjp.demo", color: "#009688", label: "Admin" },
    { name: "Quinta", email: "quinta@sjp.demo", color: "#F44336", label: "Admin" },
  ],
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, demoLogin } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setLoading(true);
    try {
      await demoLogin(email);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0D9488 0%, #0F766E 40%, #115E59 100%)" }}>
      <div className="max-w-[430px] mx-auto px-4 py-8">
        <div className="text-center mb-6 pt-4">
          <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-app-title">SJP Community</h1>
          <p className="text-teal-100 text-sm mt-1">Building community. Changing lives.</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl" data-testid="login-card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#111827] mb-1 block">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                data-testid="input-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#111827] mb-1 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#0D9488] text-white font-semibold"
              disabled={loading}
              data-testid="button-sign-in"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-sm text-[#0D9488] mt-4 font-medium" data-testid="link-create-account">
            New to SJP? Create an account
          </p>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-xs text-teal-200 font-medium whitespace-nowrap">Demo accounts (password: password123)</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {Object.entries(demoUsers).map(([group, users]) => (
            <div key={group} className="mb-4">
              <h3 className="text-[10px] font-bold text-teal-200 tracking-widest mb-2 uppercase">{group}</h3>
              <div className="grid grid-cols-2 gap-2">
                {users.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => handleDemoLogin(u.email)}
                    disabled={loading}
                    className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5 text-left transition-all hover:bg-white/20 active:scale-[0.98]"
                    data-testid={`button-demo-${u.name.toLowerCase()}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{u.name}</div>
                      <div className="text-[10px] text-teal-200">{u.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
