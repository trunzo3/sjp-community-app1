import { storage } from "./storage";
import type { AiCrisisConfig } from "@shared/schema";

let cachedConfig: AiCrisisConfig | undefined;
let lastFetch = 0;
const CACHE_TTL = 60_000;

async function getConfig(): Promise<AiCrisisConfig | undefined> {
  const now = Date.now();
  if (cachedConfig && now - lastFetch < CACHE_TTL) return cachedConfig;
  cachedConfig = await storage.getCrisisConfig();
  lastFetch = now;
  return cachedConfig;
}

export function clearCrisisCache(): void {
  cachedConfig = undefined;
  lastFetch = 0;
}

export interface CrisisResult {
  isCrisis: boolean;
  crisisInfo: {
    message: string;
    resources: string;
    disclaimer: string;
  } | null;
}

export async function detectCrisis(query: string): Promise<CrisisResult> {
  const config = await getConfig();
  if (!config) return { isCrisis: false, crisisInfo: null };

  const normalizedQuery = query.toLowerCase().trim();

  for (const word of config.triggerWords) {
    const normalizedWord = word.toLowerCase().trim();
    if (!normalizedWord) continue;

    const escaped = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let pattern: string;

    if (normalizedWord.includes(" ")) {
      const parts = normalizedWord.split(/\s+/).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      pattern = parts.map(p => p + "\\w*").join("\\s+");
    } else {
      pattern = `\\b${escaped}\\w*\\b`;
    }

    const regex = new RegExp(pattern, "i");
    if (regex.test(normalizedQuery)) {
      return {
        isCrisis: true,
        crisisInfo: {
          message: config.crisisMessage,
          resources: config.crisisResources,
          disclaimer: config.notMonitoredDisclaimer,
        },
      };
    }
  }

  return { isCrisis: false, crisisInfo: null };
}
