import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { db } from "./db";
import { users, venueLocations, aiFaqs, aiTrustedAnswers, aiCrisisConfig, moodCheckins } from "@shared/schema";
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
    { question: "What are the graduation requirements?", answer: "Graduation from SJP requires completing all program categories (Journey, Employment, Housing, Finance, Parenting, and Community), maintaining stable employment, securing housing, and completing your individualized recovery plan. Your case manager can review your specific progress.", tags: ["graduation", "requirements", "complete", "finish"], category: "Program Info", sortOrder: 3 },
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
      { triggerPhrases: ["housing help", "need housing", "find housing", "apartment", "place to live"], answer: "SJP has housing resources and partner organizations that can help. Check the Resources page under the Housing category for housing assistance programs. Your case manager can also provide personalized housing guidance.", category: "Resources" },
      { triggerPhrases: ["job help", "find a job", "employment", "resume", "interview"], answer: "SJP offers employment support through the Jobs category on the Resources page. Find job training programs, resume assistance, and employment partners there. Your case manager can connect you with specific opportunities.", category: "Resources" },
      { triggerPhrases: ["how is my progress", "my journey", "my pillars", "how am I doing"], answer: "You can view your progress on the Home page under 'My Journey.' Each category shows your completion percentage across Journey, Employment, Housing, Finance, Parenting, and Community. Talk to your case manager for a detailed progress review.", category: "Progress" },
      { triggerPhrases: ["what is sjp", "about the program", "saint john's program", "what does sjp do"], answer: "Saint John's Program for Real Change is a comprehensive recovery program for women. SJP provides housing, education, employment support, childcare, health services, legal assistance, and a supportive community to help women build self-sufficient lives.", category: "Program Info" },
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
    { name: "Mulvaney's Career Pathway Program", pillar: "jobs" as const, type: "partner" as const, providerName: "Mulvaney's B&L", phone: "(916) 441-6022", websiteUrl: "https://mulvaneysbl.com", applicableStages: ["client", "alumni"], description: "Restaurant industry job training including prep cook, front of house, and catering positions. Hands-on experience in a working restaurant environment.", createdBy: createdUsers.sarah },
    { name: "Modern Aviation Job Training", pillar: "jobs" as const, type: "partner" as const, providerName: "Modern Aviation", phone: "(916) 555-0147", applicableStages: ["client", "alumni"], description: "Aviation ground crew and operations training with full-time job placement opportunities at Sacramento International Airport.", createdBy: createdUsers.sarah },
    { name: "Sacramento Works Job Center", pillar: "jobs" as const, type: "service" as const, providerName: "Sacramento Employment & Training Agency", phone: "(916) 263-3800", websiteUrl: "https://sacramentoworks.org", applicableStages: ["client", "alumni"], description: "Free job search assistance, resume workshops, interview preparation, and access to local employer hiring events.", createdBy: createdUsers.sarah },
    { name: "SJP Housing Navigation", pillar: "housing" as const, type: "program" as const, providerName: "Saint John's Program", applicableStages: ["client", "alumni"], description: "Rental assistance up to $15,000/month, security deposits, and housing search support. Helping you find and keep a stable place to call home.", createdBy: createdUsers.sarah },
    { name: "Sacramento Housing Alliance", pillar: "housing" as const, type: "partner" as const, providerName: "Sacramento Housing Alliance", websiteUrl: "https://sachousingalliance.org", applicableStages: ["client", "alumni"], description: "Affordable housing listings and tenant rights resources for individuals and families in Sacramento County.", createdBy: createdUsers.sarah },
    { name: "Sacramento County Child Care Resource", pillar: "childcare" as const, type: "service" as const, providerName: "Sacramento County DHHS", phone: "(916) 874-3195", applicableStages: ["client", "alumni"], description: "Subsidized childcare referrals and enrollment assistance for working parents and program participants.", createdBy: createdUsers.sarah },
    { name: "Child Action Inc.", pillar: "childcare" as const, type: "partner" as const, providerName: "Child Action Inc.", phone: "(916) 369-0191", websiteUrl: "https://childaction.org", applicableStages: ["client", "alumni"], description: "After-school programs and emergency childcare support for families in transition.", createdBy: createdUsers.sarah },
    { name: "SacRT Bus Pass Program", pillar: "transportation" as const, type: "service" as const, providerName: "Sacramento Regional Transit", websiteUrl: "https://sacrt.com", applicableStages: ["client", "alumni"], description: "Discounted monthly bus passes for program participants. Covers all SacRT bus and light rail routes.", createdBy: createdUsers.sarah },
    { name: "Church Partner Transportation", pillar: "transportation" as const, type: "partner" as const, providerName: "Local Church Partners", applicableStages: ["client"], description: "Rides to appointments and job interviews through local church partners. Arrange through your case manager.", createdBy: createdUsers.sarah },
    { name: "UC Davis Health Behavioral Wellness", pillar: "health" as const, type: "partner" as const, providerName: "UC Davis Health", phone: "(916) 734-2011", websiteUrl: "https://health.ucdavis.edu", applicableStages: ["client", "alumni"], description: "Free and low-cost behavioral health services including counseling, substance use support, and psychiatric care.", createdBy: createdUsers.sarah },
    { name: "SUD Recovery & NA/AA Meetings", pillar: "health" as const, type: "service" as const, providerName: "Saint John's Program", applicableStages: ["client"], description: "On-campus substance use disorder services, therapy, and daily NA/AA meeting access. A safe space for recovery, one day at a time.", createdBy: createdUsers.sarah },
    { name: "WellSpace Health Recovery Services", pillar: "health" as const, type: "partner" as const, providerName: "WellSpace Health", phone: "(916) 737-5555", websiteUrl: "https://wellspacehealth.org", applicableStages: ["client", "alumni"], description: "Outpatient substance use recovery services, mental health counseling, and crisis support for women and families.", createdBy: createdUsers.sarah },
    { name: "SAFE Credit Union Financial Services", pillar: "money" as const, type: "partner" as const, providerName: "SAFE Credit Union", websiteUrl: "https://safecu.org", applicableStages: ["client", "alumni"], description: "On-site bank account opening, savings programs, and financial services tailored for program participants.", createdBy: createdUsers.sarah },
    { name: "Money Matters Financial Literacy", pillar: "money" as const, type: "program" as const, providerName: "Saint John's Program", applicableStages: ["client"], description: "Budgeting, credit building, and savings goals coursework. Learn to manage your money and plan for the future.", createdBy: createdUsers.sarah },
    { name: "Family Services & Advocacy", pillar: "legal" as const, type: "program" as const, providerName: "Saint John's Program", phone: "(916) 453-1482", applicableStages: ["client", "alumni"], description: "Custody navigation, child welfare advocacy, and family reunification support. Standing up for yourself and your family.", createdBy: createdUsers.sarah },
    { name: "Sacramento County Legal Aid", pillar: "legal" as const, type: "partner" as const, providerName: "Sacramento County Legal Aid", phone: "(916) 551-2150", websiteUrl: "https://saclaw.org", applicableStages: ["client", "alumni"], description: "Free legal assistance for expungement, family court, Medi-Cal enrollment, and benefits navigation.", createdBy: createdUsers.sarah },
    { name: "SJP High School Diploma Program", pillar: "education" as const, type: "program" as const, providerName: "Saint John's Program", applicableStages: ["client"], description: "On-campus GED and high school diploma classes. Flexible scheduling to work around your program commitments.", createdBy: createdUsers.sarah },
    { name: "Los Rios Community College Enrollment", pillar: "education" as const, type: "partner" as const, providerName: "Los Rios Community College District", websiteUrl: "https://losrios.edu", applicableStages: ["client", "alumni"], description: "College enrollment support and course registration assistance. Start your next chapter with higher education.", createdBy: createdUsers.sarah },
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

  const moodSeedData = [
    { userId: createdUsers.angela, coreEmotion: "restless", midEmotion: "anxious", outerEmotion: "racing", coreColor: "#EF4444", midColor: "#F87171", outerColor: "#FCA5A5", outerLabel: "Racing", daysBack: 13 },
    { userId: createdUsers.angela, coreEmotion: "restless", midEmotion: "anxious", outerEmotion: "tight", coreColor: "#EF4444", midColor: "#F87171", outerColor: "#F98B8B", outerLabel: "Tight", daysBack: 12 },
    { userId: createdUsers.angela, coreEmotion: "heavy", midEmotion: "overwhelmed", outerEmotion: "too_much", coreColor: "#8B5CF6", midColor: "#8B5CF6", outerColor: "#7C3AED", outerLabel: "Too Much", daysBack: 11 },
    { userId: createdUsers.angela, coreEmotion: "heavy", midEmotion: "sad", outerEmotion: "lonely", coreColor: "#8B5CF6", midColor: "#A78BFA", outerColor: "#AD95FB", outerLabel: "Lonely", daysBack: 10 },
    { userId: createdUsers.angela, coreEmotion: "peaceful", midEmotion: "relieved", outerEmotion: "breathing", coreColor: "#3B82F6", midColor: "#2563EB", outerColor: "#2D6CE5", outerLabel: "Breathing", daysBack: 9 },
    { userId: createdUsers.angela, coreEmotion: "peaceful", midEmotion: "calm", outerEmotion: "grounded", coreColor: "#3B82F6", midColor: "#60A5FA", outerColor: "#BFDBFE", outerLabel: "Grounded", daysBack: 7 },
    { userId: createdUsers.angela, coreEmotion: "hopeful", midEmotion: "optimistic", outerEmotion: "believing", coreColor: "#FACC15", midColor: "#FDE047", outerColor: "#FDE86B", outerLabel: "Believing", daysBack: 6 },
    { userId: createdUsers.angela, coreEmotion: "hopeful", midEmotion: "optimistic", outerEmotion: "open", coreColor: "#FACC15", midColor: "#FDE047", outerColor: "#FDE55A", outerLabel: "Open", daysBack: 5 },
    { userId: createdUsers.angela, coreEmotion: "strong", midEmotion: "brave", outerEmotion: "facing_it", coreColor: "#22C55E", midColor: "#22C55E", outerColor: "#45D87A", outerLabel: "Facing It", daysBack: 4 },
    { userId: createdUsers.angela, coreEmotion: "strong", midEmotion: "determined", outerEmotion: "ready", coreColor: "#22C55E", midColor: "#4ADE80", outerColor: "#5AE390", outerLabel: "Ready", daysBack: 3 },
    { userId: createdUsers.angela, coreEmotion: "peaceful", midEmotion: "content", outerEmotion: "grateful", coreColor: "#3B82F6", midColor: "#3B82F6", outerColor: "#2563EB", outerLabel: "Grateful", daysBack: 2 },
    { userId: createdUsers.angela, coreEmotion: "strong", midEmotion: "resilient", outerEmotion: "still_here", coreColor: "#22C55E", midColor: "#16A34A", outerColor: "#2DBE62", outerLabel: "Still Here", daysBack: 1 },

    { userId: createdUsers.monica, coreEmotion: "strong", midEmotion: "resilient", outerEmotion: "bouncing_back", coreColor: "#22C55E", midColor: "#16A34A", outerColor: "#22B358", outerLabel: "Bouncing Back", daysBack: 13 },
    { userId: createdUsers.monica, coreEmotion: "hopeful", midEmotion: "proud", outerEmotion: "accomplished", coreColor: "#FACC15", midColor: "#EAB308", outerColor: "#F0C030", outerLabel: "Accomplished", daysBack: 12 },
    { userId: createdUsers.monica, coreEmotion: "hopeful", midEmotion: "joyful", outerEmotion: "happy", coreColor: "#FACC15", midColor: "#F59E0B", outerColor: "#FBBF24", outerLabel: "Happy", daysBack: 11 },
    { userId: createdUsers.monica, coreEmotion: "peaceful", midEmotion: "content", outerEmotion: "satisfied", coreColor: "#3B82F6", midColor: "#3B82F6", outerColor: "#5B9BF7", outerLabel: "Satisfied", daysBack: 10 },
    { userId: createdUsers.monica, coreEmotion: "strong", midEmotion: "connected", outerEmotion: "supported", coreColor: "#22C55E", midColor: "#15803D", outerColor: "#1A9048", outerLabel: "Supported", daysBack: 8 },
    { userId: createdUsers.monica, coreEmotion: "hopeful", midEmotion: "proud", outerEmotion: "showing_up", coreColor: "#FACC15", midColor: "#EAB308", outerColor: "#C89500", outerLabel: "Showing Up", daysBack: 7 },
    { userId: createdUsers.monica, coreEmotion: "restless", midEmotion: "frustrated", outerEmotion: "stuck", coreColor: "#EF4444", midColor: "#EF4444", outerColor: "#F26060", outerLabel: "Stuck", daysBack: 6 },
    { userId: createdUsers.monica, coreEmotion: "peaceful", midEmotion: "calm", outerEmotion: "centered", coreColor: "#3B82F6", midColor: "#60A5FA", outerColor: "#93C5FD", outerLabel: "Centered", daysBack: 5 },
    { userId: createdUsers.monica, coreEmotion: "strong", midEmotion: "brave", outerEmotion: "courageous", coreColor: "#22C55E", midColor: "#22C55E", outerColor: "#38D06E", outerLabel: "Courageous", daysBack: 4 },
    { userId: createdUsers.monica, coreEmotion: "hopeful", midEmotion: "joyful", outerEmotion: "warm", coreColor: "#FACC15", midColor: "#F59E0B", outerColor: "#F09000", outerLabel: "Warm", daysBack: 2 },
    { userId: createdUsers.monica, coreEmotion: "strong", midEmotion: "connected", outerEmotion: "seen", coreColor: "#22C55E", midColor: "#15803D", outerColor: "#209A50", outerLabel: "Seen", daysBack: 1 },

    { userId: createdUsers.destiny, coreEmotion: "heavy", midEmotion: "overwhelmed", outerEmotion: "drowning", coreColor: "#8B5CF6", midColor: "#8B5CF6", outerColor: "#9B72F7", outerLabel: "Drowning", daysBack: 14 },
    { userId: createdUsers.destiny, coreEmotion: "heavy", midEmotion: "sad", outerEmotion: "hurting", coreColor: "#8B5CF6", midColor: "#A78BFA", outerColor: "#C4B5FD", outerLabel: "Hurting", daysBack: 13 },
    { userId: createdUsers.destiny, coreEmotion: "restless", midEmotion: "scared", outerEmotion: "afraid", coreColor: "#EF4444", midColor: "#B91C1C", outerColor: "#C72828", outerLabel: "Afraid", daysBack: 12 },
    { userId: createdUsers.destiny, coreEmotion: "heavy", midEmotion: "numb", outerEmotion: "going_through_motions", coreColor: "#8B5CF6", midColor: "#6D28D9", outerColor: "#6425CC", outerLabel: "Going Through Motions", daysBack: 11 },
    { userId: createdUsers.destiny, coreEmotion: "restless", midEmotion: "anxious", outerEmotion: "on_edge", coreColor: "#EF4444", midColor: "#F87171", outerColor: "#FBB5B5", outerLabel: "On Edge", daysBack: 10 },
    { userId: createdUsers.destiny, coreEmotion: "peaceful", midEmotion: "resting", outerEmotion: "quiet", coreColor: "#3B82F6", midColor: "#1E40AF", outerColor: "#2850BF", outerLabel: "Quiet", daysBack: 8 },
    { userId: createdUsers.destiny, coreEmotion: "strong", midEmotion: "brave", outerEmotion: "standing_tall", coreColor: "#22C55E", midColor: "#22C55E", outerColor: "#16A34A", outerLabel: "Standing Tall", daysBack: 7 },
    { userId: createdUsers.destiny, coreEmotion: "hopeful", midEmotion: "excited", outerEmotion: "alive", coreColor: "#FACC15", midColor: "#FACC15", outerColor: "#FBDA52", outerLabel: "Alive", daysBack: 5 },
    { userId: createdUsers.destiny, coreEmotion: "strong", midEmotion: "determined", outerEmotion: "focused", coreColor: "#22C55E", midColor: "#4ADE80", outerColor: "#86EFAC", outerLabel: "Focused", daysBack: 4 },
    { userId: createdUsers.destiny, coreEmotion: "hopeful", midEmotion: "proud", outerEmotion: "worthy", coreColor: "#FACC15", midColor: "#EAB308", outerColor: "#D4A006", outerLabel: "Worthy", daysBack: 3 },
    { userId: createdUsers.destiny, coreEmotion: "peaceful", midEmotion: "content", outerEmotion: "comfortable", coreColor: "#3B82F6", midColor: "#3B82F6", outerColor: "#4A90F5", outerLabel: "Comfortable", daysBack: 2 },
    { userId: createdUsers.destiny, coreEmotion: "strong", midEmotion: "resilient", outerEmotion: "getting_through", coreColor: "#22C55E", midColor: "#16A34A", outerColor: "#0E8A3C", outerLabel: "Getting Through", daysBack: 1 },
  ];

  for (const m of moodSeedData) {
    const checkedInAt = daysAgo(m.daysBack);
    await db.insert(moodCheckins).values({
      userId: m.userId,
      coreEmotion: m.coreEmotion,
      midEmotion: m.midEmotion,
      outerEmotion: m.outerEmotion,
      coreColor: m.coreColor,
      midColor: m.midColor,
      outerColor: m.outerColor,
      outerLabel: m.outerLabel,
      checkedInAt,
    });
  }

  console.log("Seed data inserted successfully.");
}
