import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { db } from "./db";
import { users, venueLocations, aiFaqs, aiTrustedAnswers, aiCrisisConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getNextDay(dayOfWeek: number): string {
  const now = new Date();
  const diff = (dayOfWeek - now.getDay() + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(d.getDate() + diff);
  return dateStr(d);
}

function getComingFriday(): string {
  return getNextDay(5);
}

function getNextWednesday(): string {
  return getNextDay(3);
}

const venueImageMap: { name: string; unsplashUrl: string; filename: string }[] = [
  { name: "Main Campus — Community Room", unsplashUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80", filename: "venue-community-room.jpg" },
  { name: "Main Campus — Garden Area", unsplashUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80", filename: "venue-garden-area.jpg" },
  { name: "Gateway Building — Room 102", unsplashUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80", filename: "venue-gateway-102.jpg" },
  { name: "OSS Building — Main Hall", unsplashUrl: "https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=800&q=80", filename: "venue-oss-hall.jpg" },
  { name: "Off Campus", unsplashUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80", filename: "venue-off-campus.jpg" },
];

async function downloadVenueImage(url: string, filepath: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    return true;
  } catch (err: any) {
    console.warn(`[seed] Failed to download venue image from ${url}: ${err.message}`);
    return false;
  }
}

async function seedVenueLocations() {
  const venuesDir = path.resolve("uploads/venues");
  if (!fs.existsSync(venuesDir)) {
    fs.mkdirSync(venuesDir, { recursive: true });
  }

  const existing = await db.select().from(venueLocations).limit(1);
  if (existing.length > 0) {
    for (const venue of venueImageMap) {
      const filepath = path.join(venuesDir, venue.filename);
      if (!fs.existsSync(filepath)) {
        const ok = await downloadVenueImage(venue.unsplashUrl, filepath);
        if (ok) {
          const localUrl = `/uploads/venues/${venue.filename}`;
          await db.update(venueLocations).set({ photoUrl: localUrl }).where(eq(venueLocations.name, venue.name));
          console.log(`[seed] Downloaded and updated venue photo: ${venue.name}`);
        }
      }
    }
    return;
  }

  for (const venue of venueImageMap) {
    const filepath = path.join(venuesDir, venue.filename);
    const ok = await downloadVenueImage(venue.unsplashUrl, filepath);
    const photoUrl = ok ? `/uploads/venues/${venue.filename}` : "";
    await db.insert(venueLocations).values({ name: venue.name, photoUrl }).onConflictDoNothing();
    if (ok) {
      console.log(`[seed] Seeded venue with photo: ${venue.name}`);
    }
  }
}

async function seedAiContent() {
  const existingFaqsList = await db.select().from(aiFaqs).limit(1);

  if (existingFaqsList.length === 0) {
  const faqData = [
    { question: "What are the program hours?", answer: "The SJP residential program operates 24/7. Structured programming runs Monday through Friday, 8 AM to 5 PM, with evening and weekend activities available. Check the Events page for the current schedule.", tags: ["hours", "schedule", "program"], category: "Program Info", sortOrder: 0 },
    { question: "Is transportation available?", answer: "SJP provides transportation assistance for program-related activities, job interviews, and medical appointments. Speak with your case manager to arrange transportation. Sacramento Regional Transit passes may also be available.", tags: ["transportation", "bus", "ride", "transit"], category: "Program Info", sortOrder: 1 },
    { question: "Is childcare provided?", answer: "Yes! SJP's Children's Program provides on-site childcare and educational support for children of program participants. Children receive tutoring, enrichment activities, and social-emotional support while you focus on your recovery.", tags: ["childcare", "children", "kids", "daycare"], category: "Program Info", sortOrder: 2 },
    { question: "What are the graduation requirements?", answer: "Graduation from SJP requires completing all five program pillars (Community, Confidence, Resilience, Readiness, and Wellness), maintaining stable employment, securing housing, and completing your individualized recovery plan. Your case manager can review your specific progress.", tags: ["graduation", "requirements", "complete", "finish"], category: "Program Info", sortOrder: 3 },
    { question: "What benefits are available after graduation?", answer: "As an alumni, you maintain access to the SJP community, alumni events, resource referrals, and the alumni mentoring program. You can continue using the community app, attend celebrations, and access partner services. Check the Resources page for current offerings.", tags: ["alumni", "benefits", "after graduation", "graduate"], category: "Alumni", sortOrder: 4 },
    { question: "How do I contact my case manager?", answer: "Your case manager is available during regular program hours (Mon-Fri, 8 AM - 5 PM). You can find them in the staff offices on campus, or ask at the front desk. For urgent matters outside business hours, contact the on-duty staff member.", tags: ["case manager", "contact", "staff", "help"], category: "Support", sortOrder: 5 },
    { question: "How do I access community resources?", answer: "Browse the Resources page in this app to find partner organizations, services, and opportunities filtered by category. Resources are matched to your current program stage. If you need help navigating resources, your case manager can assist you.", tags: ["resources", "services", "help", "community"], category: "Resources", sortOrder: 6 },
    { question: "How do I share my success story?", answer: "Alumni can share their success stories through the app! Go to the Community page and look for the Share Story option. Stories go through a brief review by staff before being featured. Your story can inspire other women on their journey.", tags: ["story", "share", "success", "alumni"], category: "Community", sortOrder: 7 },
    { question: "What wellness programs are available?", answer: "SJP offers various wellness programs including yoga, meditation, nutrition education, fitness activities, and mental health support. Check the Events page for upcoming wellness workshops and classes.", tags: ["wellness", "yoga", "meditation", "health", "fitness"], category: "Wellness", sortOrder: 8 },
    { question: "How do I sign up for events?", answer: "Browse upcoming events on the Events page. Most SJP events are open to all current participants at your program stage. Some partner events may require RSVP — check the event details for specific instructions.", tags: ["events", "sign up", "register", "RSVP"], category: "Events", sortOrder: 9 },
  ];

    for (const faq of faqData) {
      await storage.createFaq({ ...faq, active: true });
    }
  }

  const existingTa = await db.select().from(aiTrustedAnswers).limit(1);
  if (existingTa.length === 0) {
    const trustedAnswerData = [
      { triggerPhrases: ["when is the next event", "upcoming events", "what events are coming up", "next workshop"], answer: "Check the Events page for all upcoming events, workshops, and community gatherings. Events are filtered to show what's relevant for your current program stage.", category: "Events" },
      { triggerPhrases: ["who is my case manager", "find my case manager", "talk to someone", "need help"], answer: "Your case manager is available during program hours (Mon-Fri, 8 AM - 5 PM) in the staff offices. You can also ask at the front desk. For immediate assistance, speak with any on-duty staff member.", category: "Support" },
      { triggerPhrases: ["housing help", "need housing", "find housing", "apartment", "place to live"], answer: "SJP has housing resources and partner organizations that can help. Check the Resources page under the 'Readiness' pillar for housing assistance programs. Your case manager can also provide personalized housing guidance.", category: "Resources" },
      { triggerPhrases: ["job help", "find a job", "employment", "resume", "interview"], answer: "SJP offers employment readiness support through the Readiness pillar. Check the Resources page for job training programs, resume assistance, and employment partners. Your case manager can connect you with specific opportunities.", category: "Resources" },
      { triggerPhrases: ["how is my progress", "my journey", "my pillars", "how am I doing"], answer: "You can view your progress across all five pillars on the Home page under 'My Journey.' Each pillar shows your completion percentage. Talk to your case manager for a detailed progress review.", category: "Progress" },
      { triggerPhrases: ["what is sjp", "about the program", "saint john's program", "what does sjp do"], answer: "Saint John's Program for Real Change is a comprehensive recovery program for women. The program is built around five pillars: Community, Confidence, Resilience, Readiness, and Wellness. SJP provides housing, education, employment support, childcare, and a supportive community to help women build self-sufficient lives.", category: "Program Info" },
    ];

    for (const ta of trustedAnswerData) {
      await storage.createTrustedAnswer({ ...ta, active: true });
    }
  }

  const existingCrisis = await db.select().from(aiCrisisConfig).limit(1);
  if (existingCrisis.length === 0) {
    await storage.upsertCrisisConfig({
      triggerWords: [
        "suicidal", "suicide", "kill myself", "end my life", "want to die",
        "hurt myself", "self harm", "self-harm", "cutting myself",
        "overdose", "abuse", "being abused", "domestic violence",
        "emergency", "in danger", "not safe", "unsafe",
        "relapse", "using again", "started drinking", "started using"
      ],
      crisisMessage: "It sounds like you may be going through a really difficult time. You are not alone, and help is available right now.",
      crisisResources: "988 Suicide & Crisis Lifeline: Call or text 988 (24/7)\nCrisis Text Line: Text HOME to 741741\nNational Domestic Violence Hotline: 1-800-799-7233\nSAMHSA Helpline: 1-800-662-4357\nSJP Staff: Available on campus Mon-Fri 8 AM - 5 PM",
      notMonitoredDisclaimer: "This app is not monitored 24/7. If you are in immediate danger, please call 911 or go to your nearest emergency room. The resources listed above are available around the clock.",
      active: true,
    });
  }

  console.log("AI content seeded successfully.");
}

export async function seedDatabase() {
  await seedVenueLocations();
  await seedAiContent();

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) return;

  const hash = await bcrypt.hash("password123", 10);

  const monicaGrad = daysAgo(210);
  const tashaGrad = daysAgo(95);
  const deniseGrad = daysAgo(425);

  const seedUsers = [
    { email: "angela@sjp.demo", password: hash, firstName: "Angela", lastName: "Torres", role: "client" as const, stage: "client" as const, graduationDate: null, avatarColor: "#34737A", bio: "Just started at Gateway. Taking it one day at a time." },
    { email: "keisha@sjp.demo", password: hash, firstName: "Keisha", lastName: "Williams", role: "client" as const, stage: "client" as const, graduationDate: null, avatarColor: "#5DA592", bio: "Two weeks in. Already learning so much." },
    { email: "destiny@sjp.demo", password: hash, firstName: "Destiny", lastName: "Johnson", role: "client" as const, stage: "client" as const, graduationDate: null, avatarColor: "#D32027", bio: "Working on my future every day. Moved to OSS last month." },
    { email: "maria@sjp.demo", password: hash, firstName: "Maria", lastName: "Garcia", role: "client" as const, stage: "client" as const, graduationDate: null, avatarColor: "#979DB6", bio: "Kitchen team and loving it. Getting ready for what's next." },
    { email: "monica@sjp.demo", password: hash, firstName: "Monica", lastName: "Davis", role: "alumni" as const, stage: "alumni" as const, graduationDate: dateStr(monicaGrad), avatarColor: "#EEBBA7", bio: "Working full-time at Golden 1 Center. My kids are home with me." },
    { email: "tasha@sjp.demo", password: hash, firstName: "Tasha", lastName: "Robinson", role: "alumni" as const, stage: "alumni" as const, graduationDate: dateStr(tashaGrad), avatarColor: "#34737A", bio: "Just started my new customer service role. Grateful every day." },
    { email: "denise@sjp.demo", password: hash, firstName: "Denise", lastName: "Mitchell", role: "alumni" as const, stage: "alumni" as const, graduationDate: dateStr(deniseGrad), avatarColor: "#5DA592", bio: "Promoted at work, stable housing, living my best life." },
    { email: "sarah@sjp.demo", password: hash, firstName: "Sarah", lastName: "Chen", role: "staff" as const, stage: "client" as const, graduationDate: null, avatarColor: "#D32027", bio: "Community coordinator. Here to support your journey." },
    { email: "james@sjp.demo", password: hash, firstName: "James", lastName: "Wright", role: "staff" as const, stage: "client" as const, graduationDate: null, avatarColor: "#979DB6", bio: "Case manager. Your success is my success." },
    { email: "broc@sjp.demo", password: hash, firstName: "Broc", lastName: "Thompson", role: "staff" as const, stage: "client" as const, graduationDate: null, avatarColor: "#EEBBA7", bio: "Program staff. Let's build something together." },
    { email: "scott@sjp.demo", password: hash, firstName: "Scott", lastName: "Richards", role: "admin" as const, stage: "alumni" as const, graduationDate: null, avatarColor: "#34737A", bio: "CEO. Proud of every woman who walks through our doors." },
    { email: "quinta@sjp.demo", password: hash, firstName: "Quinta", lastName: "Adams", role: "admin" as const, stage: "alumni" as const, graduationDate: null, avatarColor: "#D32027", bio: "Program lead. This community is everything." },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of seedUsers) {
    const user = await storage.createUser(u);
    createdUsers[u.firstName.toLowerCase()] = user.id;
  }

  const today = dateStr(new Date());
  const in2 = dateStr(new Date(Date.now() + 2 * 86400000));
  const in4 = dateStr(new Date(Date.now() + 4 * 86400000));
  const in7 = dateStr(new Date(Date.now() + 7 * 86400000));
  const in14 = dateStr(new Date(Date.now() + 14 * 86400000));

  const seedResources = [
    { name: "Mulvaney's Career Pathway Program", pillar: "readiness" as const, type: "partner" as const, providerName: "Mulvaney's B&L", phone: "(916) 441-6022", websiteUrl: "https://mulvaneysbl.com", applicableStages: ["client", "alumni"], description: "Restaurant industry job training including prep cook, front of house, and catering positions. Hands-on experience in a working restaurant environment.", createdBy: createdUsers.sarah },
    { name: "UC Davis Behavioral Wellness", pillar: "wellness" as const, type: "partner" as const, providerName: "UC Davis Health", phone: "(916) 734-2011", websiteUrl: "https://health.ucdavis.edu", applicableStages: ["client", "alumni"], description: "Free and low-cost behavioral health services including counseling, substance use support, and psychiatric care.", createdBy: createdUsers.sarah },
    { name: "Modern Aviation Job Training", pillar: "readiness" as const, type: "partner" as const, providerName: "Modern Aviation", phone: "(916) 555-0147", applicableStages: ["client", "alumni"], description: "Aviation ground crew and operations training with full-time job placement opportunities at Sacramento International Airport.", createdBy: createdUsers.sarah },
    { name: "Single Mom Strong", pillar: "community" as const, type: "partner" as const, providerName: "Single Mom Strong Sacramento", websiteUrl: "https://singlemomstrong.org", applicableStages: ["alumni"], description: "Post-program community support for single mothers. Peer networking, resource sharing, and ongoing encouragement.", createdBy: createdUsers.sarah },
    { name: "SJP Life Skills Workshop Series", pillar: "confidence" as const, type: "program" as const, providerName: "Saint John's Program", applicableStages: ["client"], description: "Weekly workshops covering budgeting, conflict resolution, goal setting, and personal development. Building your foundation for lasting change.", createdBy: createdUsers.sarah },
    { name: "Sacramento Works Job Center", pillar: "readiness" as const, type: "service" as const, providerName: "Sacramento Employment & Training Agency", phone: "(916) 263-3800", websiteUrl: "https://sacramentoworks.org", applicableStages: ["client", "alumni"], description: "Free job search assistance, resume workshops, interview preparation, and access to local employer hiring events.", createdBy: createdUsers.sarah },
    { name: "WellSpace Health Recovery Services", pillar: "wellness" as const, type: "partner" as const, providerName: "WellSpace Health", phone: "(916) 737-5555", websiteUrl: "https://wellspacehealth.org", applicableStages: ["client", "alumni"], description: "Outpatient substance use recovery services, mental health counseling, and crisis support for women and families.", createdBy: createdUsers.sarah },
    { name: "Financial Literacy Foundations", pillar: "readiness" as const, type: "program" as const, providerName: "Saint John's Program", applicableStages: ["client"], description: "Learn to build a budget, open a bank account, understand credit, and plan for savings goals. Required coursework for all program participants.", createdBy: createdUsers.sarah },
    { name: "Parenting with Confidence", pillar: "confidence" as const, type: "program" as const, providerName: "Saint John's Program", applicableStages: ["client", "alumni"], description: "Classes focused on building healthy family relationships, communication with children, and navigating the challenges of parenting during recovery.", createdBy: createdUsers.sarah },
    { name: "SJP Alumni Mentorship Circle", pillar: "community" as const, type: "program" as const, providerName: "Saint John's Program", applicableStages: ["alumni"], description: "Monthly gatherings for alumni to connect, share experiences, and mentor women currently in the program. Your journey helps light the way for someone else.", createdBy: createdUsers.sarah },
    { name: "Family Services & Advocacy", pillar: "resilience" as const, type: "program" as const, providerName: "Saint John's Program", phone: "(916) 453-1482", applicableStages: ["client", "alumni"], description: "Support for family reunification, custody navigation, child welfare advocacy, and building healthy family structures. Standing up for yourself and your family.", createdBy: createdUsers.sarah },
    { name: "SUD Recovery & NA/AA Meetings", pillar: "wellness" as const, type: "service" as const, providerName: "Saint John's Program", applicableStages: ["client"], description: "On-campus substance use disorder services, therapy, and daily NA/AA meeting access. A safe space for recovery, one day at a time.", createdBy: createdUsers.sarah },
  ];

  for (const r of seedResources) {
    await storage.createResource(r);
  }

  const venuePhotoMap: Record<string, string> = {};
  for (const v of venueImageMap) {
    venuePhotoMap[v.name] = `/uploads/venues/${v.filename}`;
  }

  const seedEvents = [
    { name: "Daily Community Meeting", eventType: "community_meeting" as const, date: today, startTime: "15:00", endTime: "16:00", location: "Main Campus — Community Room", venuePhotoUrl: venuePhotoMap["Main Campus — Community Room"], hostUserId: createdUsers.sarah, applicableStages: ["client"], description: "Milestone celebrations, sobriety milestones, open discussion. You're here not because you're broken, but because you're strong.", createdBy: createdUsers.sarah },
    { name: "New Resident Orientation", eventType: "class" as const, date: in2, startTime: "10:00", endTime: "12:00", location: "Gateway Building — Room 102", venuePhotoUrl: venuePhotoMap["Gateway Building — Room 102"], hostUserId: createdUsers.sarah, applicableStages: ["client"], description: "Welcome session for new community members. Program overview, campus tour, and getting set up with your resources.", createdBy: createdUsers.sarah },
    { name: "Milestone Celebration Friday", eventType: "celebration" as const, date: getComingFriday(), startTime: "14:00", endTime: "15:00", location: "Main Campus — Community Room", venuePhotoUrl: venuePhotoMap["Main Campus — Community Room"], applicableStages: ["client", "alumni"], description: "Celebrating sobriety milestones, program milestones, and personal wins. Come cheer on your community.", createdBy: createdUsers.sarah },
    { name: "Resume Building Workshop", eventType: "workshop" as const, date: in4, startTime: "13:00", endTime: "15:00", location: "OSS Building — Main Hall", venuePhotoUrl: venuePhotoMap["OSS Building — Main Hall"], applicableStages: ["client"], description: "Hands-on workshop to create or update your resume. Bring your work history — we'll help you tell your professional story.", createdBy: createdUsers.sarah },
    { name: "Mulvaney's Kitchen Tour", eventType: "partner_session" as const, date: in7, startTime: "09:00", endTime: "11:00", location: "Mulvaney's B&L — 1215 19th St, Sacramento", applicableStages: ["client", "alumni"], description: "Tour the Mulvaney's kitchen, meet the team, and learn about the Career Pathway Program. Transportation provided from campus.", createdBy: createdUsers.sarah },
    { name: "Wellness Wednesday: Yoga & Meditation", eventType: "workshop" as const, date: getNextWednesday(), startTime: "08:00", endTime: "09:00", location: "Main Campus — Garden Area", venuePhotoUrl: venuePhotoMap["Main Campus — Garden Area"], hostUserId: createdUsers.sarah, applicableStages: ["client", "alumni"], description: "Start your day with gentle yoga and guided meditation. All levels welcome. Mats provided.", createdBy: createdUsers.sarah },
    { name: "Alumni Networking Brunch", eventType: "celebration" as const, date: in14, startTime: "10:00", endTime: "12:00", location: "Main Campus — Community Room", venuePhotoUrl: venuePhotoMap["Main Campus — Community Room"], applicableStages: ["alumni"], description: "Quarterly gathering for SJP alumni. Share updates, connect with old friends, and meet women who graduated after you. Brunch provided.", createdBy: createdUsers.sarah },
  ];

  for (const e of seedEvents) {
    await storage.createEvent(e);
  }

  const postData = [
    { authorId: createdUsers.sarah, content: "Welcome to our community space! This is YOUR place to connect, share wins, ask questions, and support each other. What's shared here stays here.", postType: "update" as const, pinned: true, createdAt: daysAgo(7) },
    { authorId: createdUsers.destiny, content: "Got my 60-day chip today. Didn't think I'd make it here when I first walked through those doors. Thank you all for believing in me when I couldn't believe in myself.", postType: "win" as const, pinned: false, createdAt: daysAgo(2) },
    { authorId: createdUsers.angela, content: "Does anyone know if the Medi-Cal office on Stockton Boulevard is open on Saturdays? I keep trying to call and the line is busy.", postType: "need" as const, pinned: false, createdAt: daysAgo(1) },
    { authorId: createdUsers.monica, content: "One year at Golden 1 Center today. One year of showing up, doing good work, and building something real. SJP gave me the foundation — I built the house.", postType: "win" as const, pinned: false, createdAt: daysAgo(3) },
    { authorId: createdUsers.maria, content: "Kitchen team served 200 meals today for the community event. My feet hurt but my heart is full. This is the work.", postType: "update" as const, pinned: false, createdAt: daysAgo(4) },
    { authorId: createdUsers.tasha, content: "First paycheck from my new customer service job just hit. I cried in the parking lot. Happy tears only.", postType: "win" as const, pinned: false, createdAt: daysAgo(5) },
    { authorId: createdUsers.keisha, content: "What should I expect in the first week of SUD coursework? I'm nervous but ready.", postType: "question" as const, pinned: false, createdAt: daysAgo(5) },
    { authorId: createdUsers.denise, content: "Drove past the campus today and got emotional. That place changed my life. Love to all my SJP sisters — the ones there now and the ones who came before me.", postType: "update" as const, pinned: false, createdAt: daysAgo(6) },
  ];

  const createdPosts: string[] = [];
  for (const p of postData) {
    const post = await storage.createPost(p);
    createdPosts.push(post.id);
  }

  const replyData = [
    { postId: createdPosts[1], authorId: createdUsers.maria, content: "So proud of you Destiny! You earned every single day of that.", createdAt: daysAgo(1) },
    { postId: createdPosts[1], authorId: createdUsers.sarah, content: "This is what it looks like. Keep going, Destiny.", createdAt: daysAgo(1) },
    { postId: createdPosts[1], authorId: createdUsers.keisha, content: "You're an inspiration. I'm on day 14 and seeing you hit 60 gives me hope.", createdAt: new Date(Date.now() - 12 * 3600000) },
    { postId: createdPosts[2], authorId: createdUsers.broc, content: "They're open Saturday 8am-12pm but get there early — the line gets long. I can help you with the paperwork if you need it.", createdAt: daysAgo(1) },
    { postId: createdPosts[6], authorId: createdUsers.angela, content: "It's a lot but everyone is so supportive. Just be honest and show up. You got this.", createdAt: daysAgo(5) },
    { postId: createdPosts[6], authorId: createdUsers.james, content: "Great question Keisha. The first week focuses on building a foundation. Come talk to me if you have specific concerns — my door is always open.", createdAt: daysAgo(4) },
  ];

  for (const r of replyData) {
    await storage.createReply(r);
  }

  const seedStories = [
    { authorId: createdUsers.monica, step1Content: "Before Saint John's, I was couch surfing with my two kids. We'd stay with friends until we wore out our welcome, then move to the next couch. I was working part-time at a gas station and using just to get through the day. I didn't see a way out. I thought this was just my life now.", step2Content: "The daily community meeting changed everything for me. Hearing other women talk about what they were going through — and seeing women who were further along — I started to believe it was possible. Laura helped me with my resume and interview skills. The kitchen team taught me how to show up on time, take direction, and take pride in work. But honestly? It was the women around me. They didn't let me give up.", step3Content: "Today I'm working full-time at the Golden 1 Center — I handle logistics for events. My kids are home with me. We're renting a two-bedroom apartment and it's ours. I still come back to campus for milestone celebrations because I remember what it felt like to see an alumna walk in and know that could be me someday.", shareExternally: true, approvalStatus: "approved" as const, featured: true },
    { authorId: createdUsers.denise, step1Content: "I came to Saint John's from prison. I'd been incarcerated for three years and when I got out I had nothing — no housing, no job, no family willing to take me in. I was terrified I'd end up right back where I started.", step2Content: "Saint John's didn't treat me like an ex-offender. They treated me like a person who was building something new. The workforce development program connected me with Modern Aviation and I trained for ground operations at the airport. I never would have imagined myself working at an airport. But someone at SJP saw that in me before I could see it in myself.", step3Content: "I've been at Modern Aviation for over a year now. I just got promoted to shift lead. I have my own apartment — my name is on the lease, which still feels surreal. I'm saving money for the first time in my life. I volunteer at SJP when I can because I want every woman who walks through those doors to know: your past does not define your future.", shareExternally: true, approvalStatus: "pending" as const, featured: true },
    { authorId: createdUsers.tasha, step1Content: "I was in a DV situation for six years. When I finally left, I had my daughter and a trash bag of clothes. That was it. I didn't know where to go or what to do.", step2Content: "The safety I felt at Saint John's was the first peace I'd had in years. Nobody was going to find me there. The staff helped me with a protection order, got my daughter into school, and just let me breathe for the first time. The other women understood without me having to explain.", step3Content: "I just started a customer service role and my daughter is thriving in school. We're in transitional housing and working toward our own place. I'm not where I want to be yet, but I'm so far from where I was. And I know I have a community behind me.", shareExternally: false, approvalStatus: "community_only" as const, featured: false },
  ];

  for (const s of seedStories) {
    await storage.createStory(s);
  }

  const monicaGradMs = monicaGrad.getTime();
  const tashaGradMs = tashaGrad.getTime();
  const deniseGradMs = deniseGrad.getTime();

  const seedSurveys = [
    { userId: createdUsers.monica, intervalMonths: 3, stillEmployed: true, jobTitle: "Events Logistics Assistant", raiseOrPromotion: false, housingStatus: "stable" as const, supportNeeds: "None right now — just grateful.", submittedAt: new Date(monicaGradMs + 95 * 86400000) },
    { userId: createdUsers.monica, intervalMonths: 6, stillEmployed: true, jobTitle: "Events Logistics Coordinator", raiseOrPromotion: true, promotionDetails: "Promoted from assistant to coordinator with a $2/hr raise", housingStatus: "stable" as const, supportNeeds: "Could use help finding affordable childcare near downtown.", submittedAt: new Date(monicaGradMs + 185 * 86400000) },
    { userId: createdUsers.tasha, intervalMonths: 3, stillEmployed: true, jobTitle: "Customer Service Representative", raiseOrPromotion: false, housingStatus: "transitional" as const, supportNeeds: "Still looking for stable housing. If anyone knows about openings for 2-bedroom apartments that accept vouchers, please let me know.", submittedAt: new Date(tashaGradMs + 92 * 86400000) },
    { userId: createdUsers.denise, intervalMonths: 3, stillEmployed: true, jobTitle: "Ground Operations Crew", raiseOrPromotion: false, housingStatus: "transitional" as const, supportNeeds: "Transportation to work is tough. Looking into getting my license back.", submittedAt: new Date(deniseGradMs + 100 * 86400000) },
    { userId: createdUsers.denise, intervalMonths: 6, stillEmployed: true, jobTitle: "Ground Operations Crew", raiseOrPromotion: false, housingStatus: "stable" as const, supportNeeds: "Doing well. Got my own place last month.", submittedAt: new Date(deniseGradMs + 188 * 86400000) },
    { userId: createdUsers.denise, intervalMonths: 12, stillEmployed: true, jobTitle: "Shift Lead — Ground Operations", raiseOrPromotion: true, promotionDetails: "Promoted to shift lead with benefits", housingStatus: "stable" as const, supportNeeds: "No needs — just want to give back. Can I help mentor someone?", submittedAt: new Date(deniseGradMs + 370 * 86400000) },
  ];

  for (const s of seedSurveys) {
    await storage.createSurvey(s);
  }

  const categories = ["journey", "employment", "housing", "finance", "parenting", "community"] as const;
  const progressData: Record<string, number[]> = {
    angela: [8, 1, 1, 1, 2, 1],
    keisha: [8, 1, 1, 1, 2, 1],
    destiny: [52, 5, 4, 4, 6, 3],
    maria: [88, 9, 7, 7, 10, 4],
    monica: [104, 11, 8, 8, 12, 4],
    tasha: [104, 11, 8, 8, 12, 4],
    denise: [104, 11, 8, 8, 12, 4],
  };

  for (const [name, values] of Object.entries(progressData)) {
    for (let i = 0; i < categories.length; i++) {
      await storage.upsertProgress(createdUsers[name], categories[i], values[i]);
    }
  }

  console.log("Seed data inserted successfully.");
}
