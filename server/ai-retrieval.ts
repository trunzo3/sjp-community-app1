import { storage } from "./storage";
import type { Resource, Event, Post, AiFaq, AiTrustedAnswer } from "@shared/schema";

export interface RetrievalResult {
  type: "resource" | "event" | "faq" | "trusted_answer" | "announcement";
  id: string;
  title: string;
  snippet: string;
  score: number;
  linkPath: string;
}

export interface ContentSearchProvider {
  search(query: string, userStage?: string): Promise<RetrievalResult[]>;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(t => t.length > 2);
}

function scoreText(query: string, target: string): number {
  const normalizedQuery = normalize(query);
  const normalizedTarget = normalize(target);

  if (normalizedTarget === normalizedQuery) return 100;
  if (normalizedTarget.includes(normalizedQuery)) return 85;
  if (normalizedQuery.includes(normalizedTarget)) return 70;

  const queryTokens = tokenize(query);
  const targetTokens = new Set(tokenize(target));

  if (queryTokens.length === 0) return 0;

  let matchedTokens = 0;
  let partialScore = 0;

  for (const qt of queryTokens) {
    if (targetTokens.has(qt)) {
      matchedTokens++;
    } else {
      for (const tt of targetTokens) {
        if (tt.includes(qt) || qt.includes(tt)) {
          partialScore += 0.5;
          break;
        }
      }
    }
  }

  const tokenScore = ((matchedTokens + partialScore) / queryTokens.length) * 75;
  return Math.min(tokenScore, 80);
}

function bestScore(query: string, ...fields: (string | null | undefined)[]): number {
  let best = 0;
  for (const field of fields) {
    if (!field) continue;
    const s = scoreText(query, field);
    if (s > best) best = s;
  }
  return best;
}

function scoreTagMatch(query: string, tags: string[]): number {
  const queryTokens = tokenize(query);
  let matched = 0;
  for (const qt of queryTokens) {
    for (const tag of tags) {
      const normalizedTag = normalize(tag);
      if (normalizedTag === qt || normalizedTag.includes(qt) || qt.includes(normalizedTag)) {
        matched++;
        break;
      }
    }
  }
  if (queryTokens.length === 0) return 0;
  return (matched / queryTokens.length) * 60;
}

function truncate(text: string, maxLen = 200): string {
  if (!text || text.length <= maxLen) return text || "";
  return text.substring(0, maxLen) + "...";
}

export class KeywordSearchProvider implements ContentSearchProvider {
  async search(query: string, userStage?: string): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];

    const [resources, events, faqs, trustedAnswers, pinnedPosts] = await Promise.all([
      storage.getResources(userStage),
      storage.getFutureEvents(userStage),
      storage.getFaqs(true),
      storage.getTrustedAnswers(true),
      storage.getPinnedPosts(),
    ]);

    for (const r of resources) {
      const fieldScore = bestScore(query, r.name, r.description, r.providerName, r.pillar, r.type);
      if (fieldScore > 20) {
        const details = [
          r.providerName ? `Provider: ${r.providerName}` : null,
          r.pillar ? `Pillar: ${r.pillar}` : null,
          r.type ? `Type: ${r.type}` : null,
        ].filter(Boolean).join(" | ");
        results.push({
          type: "resource",
          id: r.id,
          title: r.name,
          snippet: `${details}. ${truncate(r.description)}`,
          score: fieldScore,
          linkPath: "/resources",
        });
      }
    }

    for (const e of events) {
      const fieldScore = bestScore(query, e.name, e.description, e.eventType, e.location);
      if (fieldScore > 20) {
        const details = [
          e.date ? `Date: ${e.date}` : null,
          e.time ? `Time: ${e.time}` : null,
          e.location ? `Location: ${e.location}` : null,
          e.eventType ? `Type: ${e.eventType}` : null,
        ].filter(Boolean).join(" | ");
        results.push({
          type: "event",
          id: e.id,
          title: e.name,
          snippet: `${details}. ${truncate(e.description)}`,
          score: fieldScore,
          linkPath: `/events/${e.id}`,
        });
      }
    }

    for (const f of faqs) {
      const fieldScore = bestScore(query, f.question, f.answer);
      const tagScore = scoreTagMatch(query, f.tags);
      const combinedScore = Math.max(fieldScore, tagScore);
      if (combinedScore > 20) {
        results.push({
          type: "faq",
          id: f.id,
          title: f.question,
          snippet: truncate(f.answer),
          score: combinedScore + 5,
          linkPath: "",
        });
      }
    }

    for (const ta of trustedAnswers) {
      let triggerScore = 0;
      for (const phrase of ta.triggerPhrases) {
        const s = scoreText(query, phrase);
        if (s > triggerScore) triggerScore = s;
      }
      const answerScore = bestScore(query, ta.answer);
      const combinedScore = Math.max(triggerScore, answerScore);
      if (combinedScore > 25) {
        results.push({
          type: "trusted_answer",
          id: ta.id,
          title: ta.triggerPhrases[0] || "Trusted Answer",
          snippet: truncate(ta.answer),
          score: combinedScore + 10,
          linkPath: "",
        });
      }
    }

    for (const p of pinnedPosts) {
      const fieldScore = bestScore(query, p.content);
      if (fieldScore > 20) {
        results.push({
          type: "announcement",
          id: p.id,
          title: "Announcement",
          snippet: truncate(p.content),
          score: fieldScore,
          linkPath: "/community",
        });
      }
    }

    const eventKeywords = ["event", "events", "workshop", "upcoming", "next", "schedule", "calendar", "class", "session", "gathering"];
    const resourceKeywords = ["resource", "resources", "help", "housing", "job", "employment", "wellness", "support", "service", "program", "childcare", "transportation"];
    const queryTokens = tokenize(query);

    const wantsEvents = queryTokens.some(t => eventKeywords.some(ek => ek.includes(t) || t.includes(ek)));
    const wantsResources = queryTokens.some(t => resourceKeywords.some(rk => rk.includes(t) || t.includes(rk)));

    if (wantsEvents && !results.some(r => r.type === "event")) {
      for (const e of events.slice(0, 3)) {
        const details = [
          e.date ? `Date: ${e.date}` : null,
          e.time ? `Time: ${e.time}` : null,
          e.location ? `Location: ${e.location}` : null,
          e.eventType ? `Type: ${e.eventType}` : null,
        ].filter(Boolean).join(" | ");
        results.push({
          type: "event",
          id: e.id,
          title: e.name,
          snippet: `${details}. ${truncate(e.description)}`,
          score: 50,
          linkPath: `/events/${e.id}`,
        });
      }
    }

    if (wantsResources && !results.some(r => r.type === "resource")) {
      for (const r of resources.slice(0, 3)) {
        const details = [
          r.providerName ? `Provider: ${r.providerName}` : null,
          r.pillar ? `Pillar: ${r.pillar}` : null,
        ].filter(Boolean).join(" | ");
        results.push({
          type: "resource",
          id: r.id,
          title: r.name,
          snippet: `${details}. ${truncate(r.description)}`,
          score: 50,
          linkPath: "/resources",
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 10);
  }
}

export const searchProvider = new KeywordSearchProvider();
