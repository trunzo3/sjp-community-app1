import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import sjpLogo from "@assets/FF_SJP_Logos_Digital_Primary_SJP_FullColorWhiteText_1772578179749.png";

const demoUsers = {
  CLIENTS: [
    { name: "Angela", email: "angela@sjp.demo", color: "#34737A", label: "Client" },
    { name: "Keisha", email: "keisha@sjp.demo", color: "#5DA592", label: "Client" },
    { name: "Destiny", email: "destiny@sjp.demo", color: "#D32027", label: "Client" },
    { name: "Maria", email: "maria@sjp.demo", color: "#979DB6", label: "Client" },
  ],
  ALUMNI: [
    { name: "Monica", email: "monica@sjp.demo", color: "#EEBBA7", label: "Alumni" },
    { name: "Tasha", email: "tasha@sjp.demo", color: "#34737A", label: "Alumni" },
    { name: "Denise", email: "denise@sjp.demo", color: "#5DA592", label: "Alumni" },
  ],
  STAFF: [
    { name: "Sarah", email: "sarah@sjp.demo", color: "#D32027", label: "Staff" },
    { name: "James", email: "james@sjp.demo", color: "#979DB6", label: "Staff" },
    { name: "Broc", email: "broc@sjp.demo", color: "#EEBBA7", label: "Staff" },
  ],
  ADMIN: [
    { name: "Scott", email: "scott@sjp.demo", color: "#34737A", label: "Admin" },
    { name: "Quinta", email: "quinta@sjp.demo", color: "#D32027", label: "Admin" },
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
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #34737A 0%, #2C6169 40%, #1F4F49 100%)" }}>
      <div className="max-w-[430px] mx-auto px-4 py-8">
        <div className="text-center mb-6 pt-4">
          <img src={sjpLogo} alt="Saint John's Program for Real Change" className="mx-auto mb-4" style={{ height: "217.6px" }} data-testid="img-sjp-logo" />
          <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-app-title">SJP Community</h1>
          <p className="text-white/70 text-sm mt-1">Building community. Changing lives.</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl" data-testid="login-card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#302D2E] mb-1 block">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                data-testid="input-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#302D2E] mb-1 block">Password</label>
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
              className="w-full bg-[#34737A] text-white font-semibold"
              disabled={loading}
              data-testid="button-sign-in"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-xs text-white/60 font-medium whitespace-nowrap">Demo accounts (password: password123)</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {Object.entries(demoUsers).map(([group, users]) => (
            <div key={group} className="mb-4">
              <h3 className="text-[10px] font-bold text-white/60 tracking-widest mb-2 uppercase">{group}</h3>
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
                      <div className="text-[10px] text-white/60">{u.label}</div>
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
