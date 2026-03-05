import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2, Plus, X, Phone } from "lucide-react";
import type { SafetyPlan } from "@shared/schema";

interface TrustedContact {
  name: string;
  phone: string;
}

interface HelplineContact {
  name: string;
  phone: string;
}

function useSaveField(field: string) {
  const queryClient = useQueryClient();
  const savingRef = useRef(false);

  const save = useCallback(async (value: string | null) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await apiRequest("PUT", "/api/my-plan", { [field]: value });
      queryClient.invalidateQueries({ queryKey: ["/api/my-plan"] });
    } catch {
      try {
        await apiRequest("PUT", "/api/my-plan", { [field]: value });
        queryClient.invalidateQueries({ queryKey: ["/api/my-plan"] });
      } catch {}
    } finally {
      savingRef.current = false;
    }
  }, [field, queryClient]);

  return save;
}

function TextSection({ label, prompt, placeholder, field, value }: {
  label: string;
  prompt: string;
  placeholder: string;
  field: string;
  value: string;
}) {
  const [text, setText] = useState(value);
  const save = useSaveField(field);
  const initialValueRef = useRef(value);

  useEffect(() => {
    if (value !== initialValueRef.current) {
      setText(value);
      initialValueRef.current = value;
    }
  }, [value]);

  const handleBlur = () => {
    if (text !== value) {
      save(text || null);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm" data-testid={`section-${field}`}>
      <h3 className="text-sm font-bold text-[#302D2E] mb-1">{label}</h3>
      <p className="text-xs text-[#868180] mb-3">{prompt}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full border border-[#E5E1DE] rounded-lg p-3 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#34737A]/30 focus:border-[#34737A] placeholder-[#C7C2BF] bg-white"
        data-testid={`input-${field}`}
      />
    </div>
  );
}

function TrustedPeopleSection({ value }: { value: string }) {
  const [contacts, setContacts] = useState<TrustedContact[]>(() => {
    try { return JSON.parse(value) || []; } catch { return []; }
  });
  const save = useSaveField("trustedPeople");
  const initialRef = useRef(value);

  useEffect(() => {
    if (value !== initialRef.current) {
      try { setContacts(JSON.parse(value) || []); } catch { setContacts([]); }
      initialRef.current = value;
    }
  }, [value]);

  const saveContacts = (updated: TrustedContact[]) => {
    const filtered = updated.filter(c => c.name.trim() || c.phone.trim());
    save(filtered.length > 0 ? JSON.stringify(filtered) : null);
  };

  const handleBlur = () => {
    saveContacts(contacts);
  };

  const addContact = () => {
    if (contacts.length >= 8) return;
    setContacts([...contacts, { name: "", phone: "" }]);
  };

  const removeContact = (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    saveContacts(updated);
  };

  const updateContact = (index: number, field: "name" | "phone", val: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: val };
    setContacts(updated);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm" data-testid="section-trustedPeople">
      <h3 className="text-sm font-bold text-[#302D2E] mb-1">People I trust</h3>
      <p className="text-xs text-[#868180] mb-3">Who can I reach out to when I need support?</p>

      <div className="space-y-2">
        {contacts.map((contact, i) => (
          <div key={i} className="flex items-center gap-2" data-testid={`contact-row-${i}`}>
            <input
              type="text"
              value={contact.name}
              onChange={(e) => updateContact(i, "name", e.target.value)}
              onBlur={handleBlur}
              placeholder="Name"
              className="flex-1 border border-[#E5E1DE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#34737A]/30 focus:border-[#34737A] placeholder-[#C7C2BF]"
              data-testid={`input-contact-name-${i}`}
            />
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => updateContact(i, "phone", e.target.value)}
              onBlur={handleBlur}
              placeholder="Phone"
              className="flex-1 border border-[#E5E1DE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#34737A]/30 focus:border-[#34737A] placeholder-[#C7C2BF]"
              data-testid={`input-contact-phone-${i}`}
            />
            <button
              onClick={() => removeContact(i)}
              className="p-1 text-[#C7C2BF] hover:text-[#868180]"
              data-testid={`button-remove-contact-${i}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {contacts.length < 8 && (
        <button
          onClick={addContact}
          className="mt-3 flex items-center gap-1 text-xs text-[#34737A] font-medium"
          data-testid="button-add-contact"
        >
          <Plus className="w-3.5 h-3.5" /> Add someone
        </button>
      )}
    </div>
  );
}

function HelplineSection({ value }: { value: string }) {
  const [contacts, setContacts] = useState<HelplineContact[]>(() => {
    try { return JSON.parse(value) || []; } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const save = useSaveField("helplineContacts");
  const initialRef = useRef(value);

  useEffect(() => {
    if (value !== initialRef.current) {
      try { setContacts(JSON.parse(value) || []); } catch { setContacts([]); }
      initialRef.current = value;
    }
  }, [value]);

  const saveContacts = (updated: HelplineContact[]) => {
    save(updated.length > 0 ? JSON.stringify(updated) : null);
  };

  const handleAdd = () => {
    const trimName = newName.trim();
    const trimPhone = newPhone.trim();
    if (!trimName || !trimPhone) return;
    const updated = [...contacts, { name: trimName, phone: trimPhone }];
    setContacts(updated);
    saveContacts(updated);
    setNewName("");
    setNewPhone("");
    setAdding(false);
  };

  const handleRemove = (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    saveContacts(updated);
  };

  return (
    <div className="bg-[#FCF3EE] rounded-xl p-4" data-testid="section-helpline-contacts">
      <h3 className="text-sm font-bold text-[#302D2E] mb-1">If I need help now</h3>
      <p className="text-xs text-[#868180] mb-3">Numbers I can call when I need support right away.</p>

      <div className="space-y-2 mb-3">
        <a
          href="tel:988"
          className="flex items-center justify-between p-3 bg-white rounded-lg"
          data-testid="crisis-contact-988"
        >
          <span className="text-sm font-medium text-[#302D2E]">National Crisis Line</span>
          <div className="flex items-center gap-1.5 text-[#34737A]">
            <Phone className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">988</span>
          </div>
        </a>
        <a
          href="tel:18007997233"
          className="flex items-center justify-between p-3 bg-white rounded-lg"
          data-testid="crisis-contact-18007997233"
        >
          <span className="text-sm font-medium text-[#302D2E]">National DV Hotline</span>
          <div className="flex items-center gap-1.5 text-[#34737A]">
            <Phone className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">1-800-799-7233</span>
          </div>
        </a>
      </div>

      {contacts.length > 0 && (
        <div className="space-y-2 mb-3">
          {contacts.map((contact, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-white rounded-lg"
              data-testid={`helpline-contact-${i}`}
            >
              <a
                href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                className="flex-1 flex items-center justify-between min-w-0"
                data-testid={`helpline-call-${i}`}
              >
                <span className="text-sm font-medium text-[#302D2E] truncate mr-2">{contact.name}</span>
                <div className="flex items-center gap-1.5 text-[#34737A] shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">{contact.phone}</span>
                </div>
              </a>
              <button
                onClick={() => handleRemove(i)}
                className="ml-2 p-1 text-[#C7C2BF] hover:text-[#868180] shrink-0"
                data-testid={`button-remove-helpline-${i}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="bg-white rounded-lg p-3 space-y-2" data-testid="helpline-add-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name or organization"
            className="w-full border border-[#E5E1DE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#34737A]/30 focus:border-[#34737A] placeholder-[#C7C2BF]"
            autoFocus
            data-testid="input-helpline-name"
          />
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full border border-[#E5E1DE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#34737A]/30 focus:border-[#34737A] placeholder-[#C7C2BF]"
            data-testid="input-helpline-phone"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || !newPhone.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-[#34737A] disabled:opacity-40"
              data-testid="button-save-helpline"
            >
              Save
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(""); setNewPhone(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-[#868180] bg-white border border-[#E5E1DE]"
              data-testid="button-cancel-helpline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : contacts.length < 5 ? (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-[#34737A] font-medium"
          data-testid="button-add-helpline"
        >
          <Plus className="w-3.5 h-3.5" /> Add a number
        </button>
      ) : null}
    </div>
  );
}

export default function MyPlanPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const isClientOrAlumni = user?.role === "client" || user?.role === "alumni";

  useEffect(() => {
    if (user && !isClientOrAlumni) {
      navigate("/profile");
    }
  }, [user, isClientOrAlumni, navigate]);

  const { data: plan, isLoading } = useQuery<SafetyPlan | { exists: false }>({
    queryKey: ["/api/my-plan"],
    enabled: isClientOrAlumni,
  });

  if (!user || !isClientOrAlumni) return null;

  if (isLoading) {
    return (
      <div className="max-w-[600px] md:mx-0">
        <div className="h-[3px] bg-[#EEBBA7] -mx-4 md:mx-0 md:rounded-full mb-4" />
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#34737A]" />
        </div>
      </div>
    );
  }

  const hasPlan = plan && "id" in plan;
  const planData = hasPlan ? plan as SafetyPlan : null;

  return (
    <div className="max-w-[600px] md:mx-0">
      <div className="h-[3px] bg-[#EEBBA7] -mx-4 md:mx-0 md:rounded-full mb-4" />

      <h1 className="text-xl font-bold text-[#302D2E] mb-1" data-testid="text-my-plan-title">My Plan</h1>
      <p className="text-xs text-[#868180] mb-5 leading-relaxed" data-testid="text-privacy-statement">
        This is yours. No one at Saint John's can see what you write here — not staff, not anyone. Fill in as much or as little as you want, whenever feels right.
      </p>

      <div className="space-y-4 mb-6">
        <TextSection
          label="My warning signs"
          prompt="What do I notice in myself when I'm starting to struggle? This could be feelings, thoughts, or things I notice in my body."
          placeholder="Write whatever comes to mind..."
          field="warningSigns"
          value={planData?.warningSigns || ""}
        />

        <TrustedPeopleSection value={planData?.trustedPeople || "[]"} />

        <TextSection
          label="Places that feel safe"
          prompt="Where can I go to feel grounded or get some space when I need it?"
          placeholder="These can be places on campus, nearby, or anywhere that comes to mind..."
          field="safePlaces"
          value={planData?.safePlaces || ""}
        />

        <TextSection
          label="Things that help me cope"
          prompt="What has helped me get through hard moments before?"
          placeholder="Big things, small things — whatever has worked for you..."
          field="copingStrategies"
          value={planData?.copingStrategies || ""}
        />

        <TextSection
          label="What I'm holding onto"
          prompt="What are the reasons I keep going? What matters most to me right now?"
          placeholder="This is just for you..."
          field="reasonsToKeepGoing"
          value={planData?.reasonsToKeepGoing || ""}
        />

        <HelplineSection value={planData?.helplineContacts || "[]"} />
      </div>
    </div>
  );
}
