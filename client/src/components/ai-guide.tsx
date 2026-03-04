import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles, X, Send, BookOpen, Calendar, MessageCircle, HelpCircle, Megaphone, AlertTriangle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface Citation {
  type: string;
  id: string;
  title: string;
  linkPath: string;
}

interface CrisisInfo {
  message: string;
  resources: string;
  disclaimer: string;
}

interface AiResponse {
  answer: string;
  citations: Citation[];
  isCrisis: boolean;
  crisisInfo: CrisisInfo | null;
  confidence: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isCrisis?: boolean;
  crisisInfo?: CrisisInfo | null;
  confidence?: number;
}

function CitationCard({ citation, onClick }: { citation: Citation; onClick: () => void }) {
  const icon = citation.type === "resource" ? <BookOpen className="w-3.5 h-3.5" /> :
               citation.type === "event" ? <Calendar className="w-3.5 h-3.5" /> :
               citation.type === "faq" ? <HelpCircle className="w-3.5 h-3.5" /> :
               citation.type === "announcement" ? <Megaphone className="w-3.5 h-3.5" /> :
               <MessageCircle className="w-3.5 h-3.5" />;

  const label = citation.type === "resource" ? "Resource" :
                citation.type === "event" ? "Event" :
                citation.type === "faq" ? "FAQ" :
                citation.type === "announcement" ? "Announcement" :
                "Answer";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        citation.linkPath
          ? "bg-[#34737A]/10 text-[#34737A] border-[#34737A]/20 hover:bg-[#34737A]/20 cursor-pointer"
          : "bg-gray-100 text-gray-600 border-gray-200 cursor-default"
      }`}
      data-testid={`citation-${citation.type}-${citation.id}`}
    >
      {icon}
      <span className="truncate max-w-[180px]">{citation.title}</span>
      <span className="text-[10px] opacity-60">{label}</span>
    </button>
  );
}

function CrisisPanel({ crisisInfo }: { crisisInfo: CrisisInfo }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3" data-testid="crisis-panel">
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm font-semibold text-amber-800">{crisisInfo.message}</p>
      </div>
      <div className="ml-7 space-y-2">
        <div className="text-sm text-amber-900 whitespace-pre-line">{crisisInfo.resources}</div>
        <p className="text-xs text-amber-700 italic mt-2 pt-2 border-t border-amber-200">{crisisInfo.disclaimer}</p>
      </div>
    </div>
  );
}

export function AiGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const queryMutation = useMutation({
    mutationFn: async (query: string): Promise<AiResponse> => {
      const res = await apiRequest("POST", "/api/ai-guide/query", { query });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.answer,
        citations: data.citations,
        isCrisis: data.isCrisis,
        crisisInfo: data.crisisInfo,
        confidence: data.confidence,
      }]);
    },
    onError: () => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment, or speak with SJP staff for immediate help.",
      }]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || queryMutation.isPending) return;

    setMessages(prev => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    queryMutation.mutate(trimmed);
  };

  const handleCitationClick = (citation: Citation) => {
    if (citation.linkPath) {
      navigate(citation.linkPath);
      setIsOpen(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed z-50 w-14 h-14 rounded-full bg-[#34737A] text-white shadow-lg hover:bg-[#2C6169] transition-all flex items-center justify-center ${
            isMobile ? "bottom-20 right-4" : "bottom-6 right-6"
          }`}
          data-testid="button-ai-guide-fab"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed z-50 bg-white flex flex-col shadow-2xl ${
            isMobile
              ? "inset-0"
              : "bottom-6 right-6 w-[420px] h-[600px] rounded-2xl border border-gray-200"
          }`}
          data-testid="ai-guide-panel"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-[#34737A] text-white rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold text-sm">SJP Community Guide</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              data-testid="button-close-ai-guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" data-testid="ai-guide-messages">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 text-[#34737A] mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium text-[#302D2E] mb-1">Hi{user.firstName ? `, ${user.firstName}` : ""}!</p>
                <p className="text-xs text-[#868180] mb-4">I can help you find resources, events, and information about SJP programs.</p>
                <div className="space-y-2">
                  {["What events are coming up?", "How do I find housing help?", "What are the program hours?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        setMessages([{ role: "user", content: q }]);
                        queryMutation.mutate(q);
                      }}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-[#34737A]/5 text-[#34737A] hover:bg-[#34737A]/10 transition-colors"
                      data-testid={`button-suggestion-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "" : "w-full"}`}>
                  {msg.role === "user" ? (
                    <div className="bg-[#34737A] text-white px-3 py-2 rounded-2xl rounded-br-md text-sm" data-testid={`msg-user-${i}`}>
                      {msg.content}
                    </div>
                  ) : (
                    <div className="space-y-2" data-testid={`msg-assistant-${i}`}>
                      {msg.isCrisis && msg.crisisInfo && (
                        <CrisisPanel crisisInfo={msg.crisisInfo} />
                      )}
                      <div className="bg-gray-50 px-3 py-2 rounded-2xl rounded-bl-md text-sm text-[#302D2E] whitespace-pre-line">
                        {msg.content}
                      </div>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {msg.citations.map((c, j) => (
                            <CitationCard key={j} citation={c} onClick={() => handleCitationClick(c)} />
                          ))}
                        </div>
                      )}
                      {msg.confidence !== undefined && msg.confidence < 30 && (
                        <p className="text-[10px] text-[#868180] italic mt-1">Low confidence result — consider speaking with staff for more help.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {queryMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-50 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#34737A]" />
                  <span className="text-xs text-[#868180]">Searching SJP resources...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-2">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about resources, events, programs..."
                maxLength={500}
                className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-200 focus:outline-none focus:border-[#34737A] bg-gray-50"
                disabled={queryMutation.isPending}
                data-testid="input-ai-guide-query"
              />
              <button
                type="submit"
                disabled={!input.trim() || queryMutation.isPending}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#34737A] text-white hover:bg-[#2C6169] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                data-testid="button-send-ai-query"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[9px] text-[#C7C2BF] text-center mt-1.5 mb-0.5">
              AI-powered guide — not a substitute for speaking with staff
            </p>
          </div>
        </div>
      )}
    </>
  );
}
