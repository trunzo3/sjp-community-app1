import OpenAI from "openai";
import { searchProvider, type RetrievalResult } from "./ai-retrieval";
import { detectCrisis, type CrisisResult } from "./ai-crisis";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AiGuideResponse {
  answer: string;
  citations: { type: string; id: string; title: string; linkPath: string }[];
  isCrisis: boolean;
  crisisInfo: CrisisResult["crisisInfo"];
  confidence: number;
}

const SYSTEM_PROMPT = `You are the SJP Community Guide, a helpful assistant for Saint John's Program for Real Change. You help women in recovery find resources, events, and information within the SJP community.

RULES:
1. ONLY answer based on the provided context. Never make up information.
2. Always cite your sources by mentioning the title of the resource, event, FAQ, or announcement you reference.
3. Keep answers warm, supportive, and concise (2-4 sentences when possible).
4. Never give medical, legal, or financial advice. If asked, recommend speaking with SJP staff.
5. Never discuss topics outside of SJP programs, resources, and community.
6. If the context doesn't contain relevant information, say so honestly and suggest the user speak with staff.
7. Use encouraging, trauma-informed language. Avoid judgmental or clinical terms.
8. Format your response as plain text. Do not use markdown headers or bullet lists unless listing multiple items.`;

function buildContextPrompt(results: RetrievalResult[]): string {
  if (results.length === 0) {
    return "No relevant content was found in the SJP database for this query.";
  }

  const sections: string[] = ["Here is the relevant SJP content:"];

  for (const r of results) {
    const label = r.type === "resource" ? "Resource" :
                  r.type === "event" ? "Event" :
                  r.type === "faq" ? "FAQ" :
                  r.type === "trusted_answer" ? "Trusted Answer" :
                  "Announcement";
    sections.push(`[${label}] "${r.title}": ${r.snippet}`);
  }

  return sections.join("\n");
}

const FALLBACK_MESSAGE = "I don't have specific information about that in the SJP system right now. Here are some things I can help with:\n\n- Finding community resources (housing, employment, wellness)\n- Upcoming events and workshops\n- Program information and FAQs\n- Connecting you with staff\n\nYou can also speak directly with SJP staff for personalized help.";

export async function handleAiGuideQuery(
  query: string,
  userId: string,
  userStage: string
): Promise<AiGuideResponse> {
  const crisisResult = await detectCrisis(query);

  const results = await searchProvider.search(query, userStage);

  const topScore = results.length > 0 ? results[0].score : 0;
  const confidence = Math.min(Math.round(topScore), 100);

  const citations = results
    .filter(r => r.score > 30)
    .map(r => ({ type: r.type, id: r.id, title: r.title, linkPath: r.linkPath }));

  let answer: string;
  let responseGenerated = false;

  if (confidence < 25 || results.length === 0) {
    answer = FALLBACK_MESSAGE;
  } else {
    try {
      const contextPrompt = buildContextPrompt(results.slice(0, 6));
      console.log("[AI Guide] Calling OpenAI with", results.length, "results, top score:", topScore);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Context:\n${contextPrompt}\n\nUser question: ${query}` },
        ],
        max_tokens: 512,
      });

      const rawContent = completion.choices[0]?.message?.content;
      console.log("[AI Guide] OpenAI response length:", rawContent?.length ?? 0, "refusal:", completion.choices[0]?.message?.refusal ?? "none");
      answer = rawContent || FALLBACK_MESSAGE;
      responseGenerated = !!rawContent;
    } catch (error) {
      console.error("OpenAI API error:", error);
      answer = FALLBACK_MESSAGE;
    }
  }

  try {
    await storage.createQueryLog({
      userId,
      query,
      matchedContentType: citations.length > 0 ? citations[0].type : "none",
      matchedContentId: citations.length > 0 ? citations[0].id : null,
      confidence,
      responseGenerated,
      crisisDetected: crisisResult.isCrisis,
    });
  } catch (e) {
    console.error("Failed to log AI query:", e);
  }

  return {
    answer,
    citations,
    isCrisis: crisisResult.isCrisis,
    crisisInfo: crisisResult.crisisInfo,
    confidence,
  };
}
