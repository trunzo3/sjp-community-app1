// CONTENT PENDING SJP REVIEW
// These quotes are placeholder copy written to align with Saint John's voice and values.
// The clinical and program team should have final say on what goes in front of clients.
// This is a static data file — no database migration required to update content.

export type Pillar = "community" | "confidence" | "resilience" | "readiness" | "wellness";

export interface Affirmation {
  pillar: Pillar;
  quote: string;
  attribution: string | null;
}

// CONTENT PENDING SJP REVIEW
export const affirmations: Affirmation[] = [
  { pillar: "community", quote: "You are not here alone. Every woman in this community is rooting for you.", attribution: null },
  { pillar: "community", quote: "The strongest thing you can do is let someone in.", attribution: null },
  { pillar: "community", quote: "Community is not just where you live. It is who shows up for you.", attribution: null },
  { pillar: "community", quote: "When one of us rises, we all rise.", attribution: null },
  { pillar: "community", quote: "You belong here. That is not something you have to earn.", attribution: null },

  { pillar: "confidence", quote: "You have already done the hardest thing. You asked for help.", attribution: null },
  { pillar: "confidence", quote: "The woman you are becoming is worth every hard step.", attribution: null },
  { pillar: "confidence", quote: "You do not have to have it all figured out. You just have to keep going.", attribution: null },
  { pillar: "confidence", quote: "Your story is not over. It is just getting started.", attribution: null },
  { pillar: "confidence", quote: "You are not starting from scratch. You are starting from experience.", attribution: null },

  { pillar: "resilience", quote: "You have survived every hard day so far. Today is no different.", attribution: null },
  { pillar: "resilience", quote: "Strength does not mean nothing hurt. It means you kept going anyway.", attribution: null },
  { pillar: "resilience", quote: "Hard days are part of the journey, not the end of it.", attribution: null },
  { pillar: "resilience", quote: "Every time you got back up, you were building something. Keep building.", attribution: null },
  { pillar: "resilience", quote: "You are not the crisis that brought you here. You are what you do next.", attribution: null },

  { pillar: "readiness", quote: "Small steps count. One thing today is enough.", attribution: null },
  { pillar: "readiness", quote: "You do not have to see the whole staircase. Just take the next step.", attribution: null },
  { pillar: "readiness", quote: "Preparation is an act of hope. You are preparing because you believe in your future.", attribution: null },
  { pillar: "readiness", quote: "Every skill you learn here is yours forever. No one can take it.", attribution: null },
  { pillar: "readiness", quote: "You are getting ready for a life that is waiting for you.", attribution: null },

  { pillar: "wellness", quote: "Rest is not giving up. It is how you keep going.", attribution: null },
  { pillar: "wellness", quote: "Taking care of yourself is not selfish. It is necessary.", attribution: null },
  { pillar: "wellness", quote: "Your body and your mind have been through a lot. They deserve your kindness.", attribution: null },
  { pillar: "wellness", quote: "Healing is not linear. Every day you try is a good day.", attribution: null },
  { pillar: "wellness", quote: "You deserve to feel well. That is not a luxury. It is your right.", attribution: null },
];

export function getDailyAffirmation(): Affirmation {
  const now = new Date();
  const dateStr = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % affirmations.length;
  return affirmations[index];
}
