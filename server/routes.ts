import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcryptjs";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import MemoryStore from "memorystore";
import { handleAiGuideQuery } from "./ai-guide";
import { clearCrisisCache } from "./ai-crisis";
import { extractText, chunkText, generateEmbeddings } from "./document-processor";

const avatarsDir = path.resolve("uploads/avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const venuesDir = path.resolve("uploads/venues");
if (!fs.existsSync(venuesDir)) {
  fs.mkdirSync(venuesDir, { recursive: true });
}

const documentsDir = path.resolve("uploads/documents");
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

const allowedMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const venueAllowedMimes = new Set(["image/jpeg", "image/png", "image/webp"]);

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: avatarsDir,
    filename: (_req, _file, cb) => {
      cb(null, `temp-${Date.now()}.jpg`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_TYPE"));
    }
  },
});

const venuePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: venuesDir,
    filename: (_req, _file, cb) => {
      cb(null, `temp-venue-${Date.now()}.jpg`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (venueAllowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_VENUE_TYPE"));
    }
  },
});

const documentAllowedMimes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const documentUpload = multer({
  storage: multer.diskStorage({
    destination: documentsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".bin";
      cb(null, `doc-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (documentAllowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_DOCUMENT_TYPE"));
    }
  },
});

const SessionStore = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function stripPrivateFields(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripPrivateFields);
  if (obj instanceof Date) return obj;
  if (obj && typeof obj === "object") {
    const { password, currentStreak, longestStreak, ...rest } = obj;
    return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, stripPrivateFields(v)]));
  }
  return obj;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requireStaffOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  const user = await storage.getUser(req.session.userId);
  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(
    session({
      store: new SessionStore({ checkPeriod: 86400000 }),
      secret: process.env.SESSION_SECRET || "sjp-community-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

  await seedDatabase();

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });
    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });
    req.session.userId = user.id;
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/demo-login", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });
    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });
    req.session.userId = user.id;
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.get("/api/users", requireStaffOrAdmin, async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    const safe = allUsers.map(({ password, currentStreak, longestStreak, ...u }) => u);
    res.json(safe);
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) return res.status(401).json({ message: "Not authenticated" });
    const isOwn = req.session.userId === req.params.id;
    const isAdmin = currentUser.role === "admin";
    const isStaff = currentUser.role === "staff";
    if (!isOwn && !isAdmin) return res.status(403).json({ message: "Forbidden" });
    const allowedFields: Record<string, string[]> = {
      self: ["bio"],
      staff: ["bio", "photoUrl"],
      admin: ["bio", "photoUrl"],
    };
    const role = isAdmin ? "admin" : isStaff ? "staff" : "self";
    const allowed = allowedFields[role];
    const body: Record<string, any> = {};
    for (const key of allowed) {
      if (key in req.body) {
        body[key] = req.body[key];
      }
    }
    if (Object.keys(body).length === 0) return res.status(400).json({ message: "No valid fields to update" });
    const updated = await storage.updateUser(req.params.id, body);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, currentStreak: _cs, longestStreak: _ls, ...safeUser } = updated;
    res.json(safeUser);
  });

  const requireStaffPhotoAuth = async (req: Request, res: Response, next: NextFunction) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) return res.status(401).json({ message: "Not authenticated" });
    if (currentUser.role !== "staff" && currentUser.role !== "admin") {
      return res.status(403).json({ message: "Only staff and admin can upload photos" });
    }
    const isOwn = req.session.userId === req.params.id;
    const isAdmin = currentUser.role === "admin";
    if (!isOwn && !isAdmin) return res.status(403).json({ message: "Forbidden" });
    next();
  };

  app.post("/api/users/:id/avatar", requireAuth, requireStaffPhotoAuth, (req: Request, res: Response, next: NextFunction) => {
    avatarUpload.single("avatar")(req, res, (err: any) => {
      if (err) {
        if (err.message === "INVALID_TYPE") {
          return res.status(400).json({ message: "Only JPEG, PNG, WebP, and GIF images are allowed." });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File is too large. Maximum size is 2MB." });
        }
        return res.status(400).json({ message: "Upload failed." });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const finalName = `avatar-${req.params.id}.jpg`;
    const finalPath = path.join(avatarsDir, finalName);
    try {
      fs.renameSync(req.file.path, finalPath);
      const photoUrl = `/uploads/avatars/${finalName}?v=${Date.now()}`;
      const updated = await storage.updateUser(req.params.id, { photoUrl });
      if (!updated) {
        try { fs.unlinkSync(finalPath); } catch {}
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, currentStreak: _cs, longestStreak: _ls, ...safeUser } = updated;
      res.json(safeUser);
    } catch {
      try { if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
      try { if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath); } catch {}
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  const requireClientOrAlumni: RequestHandler = async (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user || (user.role !== "client" && user.role !== "alumni")) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };

  app.get("/api/my-plan", requireAuth, requireClientOrAlumni, async (req, res) => {
    const plan = await storage.getSafetyPlan(req.session.userId!);
    res.json(plan || { exists: false });
  });

  app.put("/api/my-plan", requireAuth, requireClientOrAlumni, async (req, res) => {
    const safetyPlanFields = z.object({
      warningSigns: z.string().nullable().optional(),
      trustedPeople: z.string().nullable().optional(),
      safePlaces: z.string().nullable().optional(),
      copingStrategies: z.string().nullable().optional(),
      reasonsToKeepGoing: z.string().nullable().optional(),
      helplineContacts: z.string().nullable().optional(),
    });
    const parsed = safetyPlanFields.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body" });
    }
    const data: Record<string, string | null> = {};
    for (const [key, val] of Object.entries(parsed.data)) {
      if (val !== undefined) data[key] = val;
    }
    const plan = await storage.upsertSafetyPlan(req.session.userId!, data);
    res.json(plan);
  });

  app.get("/api/mood/today", requireAuth, async (req, res) => {
    const checkin = await storage.getTodayMoodCheckin(req.session.userId!);
    res.json(checkin);
  });

  app.post("/api/mood", requireAuth, async (req, res) => {
    const { coreEmotion, midEmotion, outerEmotion, coreColor, midColor, outerColor, outerLabel, journalEntry } = req.body;
    if (!coreEmotion || !midEmotion || !outerEmotion || !coreColor || !midColor || !outerColor || !outerLabel) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(coreColor) || !hexPattern.test(midColor) || !hexPattern.test(outerColor)) {
      return res.status(400).json({ message: "Invalid color format" });
    }
    if (typeof outerLabel !== "string" || outerLabel.length > 50) {
      return res.status(400).json({ message: "Invalid outer label" });
    }
    if (journalEntry && (typeof journalEntry !== "string" || journalEntry.length > 2000)) {
      return res.status(400).json({ message: "Journal entry too long (max 2000 characters)" });
    }
    const checkin = await storage.upsertMoodCheckin(req.session.userId!, {
      userId: req.session.userId!,
      coreEmotion: String(coreEmotion).slice(0, 50),
      midEmotion: String(midEmotion).slice(0, 50),
      outerEmotion: String(outerEmotion).slice(0, 50),
      coreColor,
      midColor,
      outerColor,
      outerLabel,
      journalEntry: journalEntry?.trim() || null,
    });
    res.json(checkin);
  });

  app.get("/api/mood/history", requireAuth, async (req, res) => {
    const history = await storage.getMoodHistory(req.session.userId!, 90);
    res.json(history);
  });

  async function recordActivity(userId: string) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { isNew } = await storage.upsertActivity(userId, today);
      if (isNew) {
        await storage.calculateAndUpdateStreak(userId);
      }
    } catch (e) {
      console.error("Activity tracking error:", e);
    }
  }

  app.post("/api/activity", requireAuth, async (req, res) => {
    await recordActivity(req.session.userId!);
    res.json({ ok: true });
  });

  app.get("/api/streak/acknowledgment", requireAuth, async (req, res) => {
    const ack = await storage.getUnshownAcknowledgment(req.session.userId!);
    res.json(ack);
  });

  app.post("/api/streak/acknowledgment/:id/dismiss", requireAuth, async (req, res) => {
    const ack = await storage.getUnshownAcknowledgment(req.session.userId!);
    if (!ack || ack.id !== req.params.id) {
      return res.status(404).json({ message: "Acknowledgment not found" });
    }
    await storage.markAcknowledgmentShown(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/posts", requireAuth, async (req, res) => {
    const filter = req.query.filter as string | undefined;
    const postsData = await storage.getPosts(filter);
    res.json(stripPrivateFields(postsData));
  });

  app.get("/api/posts/user/:userId", requireAuth, async (req, res) => {
    const postsData = await storage.getPostsByUser(req.params.userId);
    res.json(stripPrivateFields(postsData));
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    const { content, postType, milestoneType, milestoneCategory } = req.body;
    if (!content || !postType) return res.status(400).json({ message: "Content and post type are required" });
    const validTypes = ["update", "win", "question", "need", "milestone"];
    if (!validTypes.includes(postType)) return res.status(400).json({ message: "Invalid post type" });
    const postData: any = { content, postType, authorId: req.session.userId };
    if (postType === "milestone") {
      if (!milestoneType || !milestoneCategory) {
        return res.status(400).json({ message: "Milestone type and category are required for milestone posts" });
      }
      postData.milestoneType = milestoneType;
      postData.milestoneCategory = milestoneCategory;
    }
    const post = await storage.createPost(postData);
    recordActivity(req.session.userId!);
    res.json(post);
  });

  app.patch("/api/posts/:id", requireStaffOrAdmin, async (req, res) => {
    const updated = await storage.updatePost(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Post not found" });
    res.json(updated);
  });

  app.post("/api/replies", requireAuth, async (req, res) => {
    const reply = await storage.createReply({ ...req.body, authorId: req.session.userId });
    recordActivity(req.session.userId!);
    res.json(reply);
  });

  app.get("/api/resources", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const pillar = req.query.pillar as string | undefined;
    const stageFilter = req.query.stage as string | undefined;
    const isStaffOrAdmin = user.role === "staff" || user.role === "admin";
    const stage = isStaffOrAdmin ? (stageFilter || undefined) : user.stage;
    const resourcesData = await storage.getResources(isStaffOrAdmin && !stageFilter ? undefined : stage, pillar);
    res.json(resourcesData);
  });

  app.get("/api/admin/resources", requireStaffOrAdmin, async (_req, res) => {
    const allResources = await storage.getAllResources();
    res.json(allResources);
  });

  app.post("/api/resources", requireStaffOrAdmin, async (req, res) => {
    const resource = await storage.createResource({ ...req.body, createdBy: req.session.userId });
    res.json(resource);
  });

  app.patch("/api/resources/:id", requireStaffOrAdmin, async (req, res) => {
    const updated = await storage.updateResource(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Resource not found" });
    res.json(updated);
  });

  app.delete("/api/resources/:id", requireStaffOrAdmin, async (req, res) => {
    const deleted = await storage.deleteResource(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Resource not found" });
    res.json({ message: "Deleted" });
  });

  async function enrichEventVenuePhoto(event: any) {
    if (event.venuePhotoUrl) return event;
    if (!event.location) return event;
    const venues = await storage.getVenueLocations();
    const match = venues.find((v: any) => v.name === event.location);
    if (match?.photoUrl) {
      return { ...event, venuePhotoUrl: match.photoUrl };
    }
    return event;
  }

  app.get("/api/events", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const isStaffOrAdmin = user.role === "staff" || user.role === "admin";
    const eventsData = await storage.getEvents(isStaffOrAdmin ? undefined : user.stage);
    const enriched = await Promise.all(eventsData.map(enrichEventVenuePhoto));
    res.json(enriched);
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const isStaffOrAdmin = user.role === "staff" || user.role === "admin";
    if (!isStaffOrAdmin && !event.applicableStages.includes(user.stage)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const enriched = await enrichEventVenuePhoto(event);
    let host = null;
    if (enriched.hostUserId) {
      const hostUser = await storage.getUser(enriched.hostUserId);
      if (hostUser) {
        host = {
          firstName: hostUser.firstName,
          lastName: hostUser.lastName,
          role: hostUser.role,
          bio: hostUser.bio,
          avatarColor: hostUser.avatarColor,
          photoUrl: hostUser.photoUrl,
        };
      }
    }
    recordActivity(req.session.userId!);
    res.json({ ...enriched, host });
  });

  app.get("/api/admin/events", requireStaffOrAdmin, async (_req, res) => {
    const allEvents = await storage.getAllEvents();
    res.json(allEvents);
  });

  app.get("/api/staff-users", requireStaffOrAdmin, async (_req, res) => {
    const staffUsers = await storage.getStaffUsers();
    const safe = staffUsers.map(({ password, ...u }) => u);
    res.json(safe);
  });

  app.get("/api/venue-locations", requireAuth, async (_req, res) => {
    const locations = await storage.getVenueLocations();
    res.json(locations);
  });

  app.post("/api/admin/venues/:venueId/photo", requireStaffOrAdmin, (req: Request, res: Response, next: NextFunction) => {
    venuePhotoUpload.single("photo")(req, res, (err: any) => {
      if (err) {
        if (err.message === "INVALID_VENUE_TYPE") {
          return res.status(400).json({ message: "Only JPEG, PNG, and WebP images are allowed." });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File is too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ message: "Upload failed." });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const venue = await storage.getVenueLocation(req.params.venueId);
    if (!venue) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ message: "Venue not found" });
    }
    const finalName = `venue-${req.params.venueId}.jpg`;
    const finalPath = path.join(venuesDir, finalName);
    try {
      fs.renameSync(req.file.path, finalPath);
      const photoUrl = `/uploads/venues/${finalName}?v=${Date.now()}`;
      const updated = await storage.updateVenueLocation(req.params.venueId, { photoUrl });
      res.json(updated);
    } catch {
      try { if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/events", requireStaffOrAdmin, async (req, res) => {
    if (req.body.hostUserId) {
      const host = await storage.getUser(req.body.hostUserId);
      if (!host || (host.role !== "staff" && host.role !== "admin")) {
        return res.status(400).json({ message: "Host must be a staff or admin user" });
      }
    }
    const event = await storage.createEvent({ ...req.body, createdBy: req.session.userId });
    res.json(event);
  });

  app.patch("/api/events/:id", requireStaffOrAdmin, async (req, res) => {
    if (req.body.hostUserId) {
      const host = await storage.getUser(req.body.hostUserId);
      if (!host || (host.role !== "staff" && host.role !== "admin")) {
        return res.status(400).json({ message: "Host must be a staff or admin user" });
      }
    }
    const updated = await storage.updateEvent(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Event not found" });
    res.json(updated);
  });

  app.delete("/api/events/:id", requireStaffOrAdmin, async (req, res) => {
    const deleted = await storage.deleteEvent(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/stories/featured", requireAuth, async (_req, res) => {
    const featuredStories = await storage.getFeaturedStories();
    res.json(stripPrivateFields(featuredStories));
  });

  app.get("/api/stories/pending-count", requireAuth, async (_req, res) => {
    const count = await storage.getPendingStoriesCount();
    res.json({ count });
  });

  app.get("/api/admin/stories", requireStaffOrAdmin, async (_req, res) => {
    const allStories = await storage.getAllShareableStories();
    res.json(stripPrivateFields(allStories));
  });

  app.get("/api/stories/user/:userId", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) return res.status(401).json({ message: "Not authenticated" });
    const isOwn = req.params.userId === req.session.userId;
    const isStaff = currentUser.role === "staff" || currentUser.role === "admin";
    if (!isOwn && !isStaff) return res.status(403).json({ message: "Forbidden" });
    const storiesData = await storage.getStoriesByUser(req.params.userId);
    res.json(storiesData);
  });

  app.post("/api/stories", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser || currentUser.role !== "alumni") {
      return res.status(403).json({ message: "Only alumni can submit stories" });
    }
    const story = await storage.createStory({ ...req.body, authorId: req.session.userId });
    res.json(story);
  });

  app.patch("/api/stories/:id/resubmit", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser || currentUser.role !== "alumni") {
      return res.status(403).json({ message: "Only alumni can resubmit stories" });
    }
    const existingStories = await storage.getStoriesByUser(req.session.userId!);
    const story = existingStories.find(s => s.id === req.params.id);
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.approvalStatus !== "revision_requested") {
      return res.status(400).json({ message: "Story is not in revision_requested status" });
    }
    const updated = await storage.updateStory(req.params.id, {
      step1Content: req.body.step1Content,
      step2Content: req.body.step2Content,
      step3Content: req.body.step3Content,
      shareExternally: req.body.shareExternally,
      approvalStatus: req.body.shareExternally ? "pending" : "community_only",
      revisionNote: null,
    });
    if (!updated) return res.status(404).json({ message: "Story not found" });
    res.json(updated);
  });

  app.patch("/api/stories/:id", requireStaffOrAdmin, async (req, res) => {
    const { approvalStatus, revisionNote, ...rest } = req.body;
    const updateData: any = { ...rest };
    if (approvalStatus) updateData.approvalStatus = approvalStatus;
    if (approvalStatus === "revision_requested" && revisionNote) {
      updateData.revisionNote = revisionNote;
    }
    if (approvalStatus && approvalStatus !== "revision_requested") {
      updateData.revisionNote = null;
    }
    const updated = await storage.updateStory(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "Story not found" });
    res.json(updated);
  });

  app.get("/api/reactions/:postId", requireAuth, async (req, res) => {
    const postReactions = await storage.getReactionsByPost(req.params.postId);
    res.json(postReactions);
  });

  app.post("/api/reactions", requireAuth, async (req, res) => {
    const { postId, reactionType } = req.body;
    if (!postId || !reactionType) return res.status(400).json({ message: "postId and reactionType required" });
    const existing = await storage.getReactionsByUser(req.session.userId!, postId);
    if (existing) {
      await storage.deleteReaction(existing.id);
      if (existing.reactionType === reactionType) {
        return res.json({ removed: true });
      }
    }
    const reaction = await storage.createReaction({ postId, userId: req.session.userId!, reactionType });
    recordActivity(req.session.userId!);
    res.json(reaction);
  });

  app.get("/api/admin/surveys", requireStaffOrAdmin, async (_req, res) => {
    const allSurveys = await storage.getAllSurveys();
    res.json(stripPrivateFields(allSurveys));
  });

  app.get("/api/surveys/user/:userId", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) return res.status(401).json({ message: "Not authenticated" });
    const isOwn = req.params.userId === req.session.userId;
    const isStaff = currentUser.role === "staff" || currentUser.role === "admin";
    if (!isOwn && !isStaff) return res.status(403).json({ message: "Forbidden" });
    const surveysData = await storage.getSurveysByUser(req.params.userId);
    res.json(surveysData);
  });

  app.post("/api/surveys", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser || currentUser.role !== "alumni") {
      return res.status(403).json({ message: "Only alumni can submit surveys" });
    }
    const survey = await storage.createSurvey({ ...req.body, userId: req.session.userId });
    res.json(survey);
  });

  app.patch("/api/admin/users/:id", requireStaffOrAdmin, async (req, res) => {
    const { role, stage, graduationDate } = req.body;
    const updateData: any = {};
    if (role) updateData.role = role;
    if (stage) updateData.stage = stage;
    if (graduationDate !== undefined) updateData.graduationDate = graduationDate;
    const updated = await storage.updateUser(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, currentStreak: _cs, longestStreak: _ls, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.get("/api/progress/:userId", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) return res.status(401).json({ message: "Not authenticated" });
    const isOwn = req.params.userId === req.session.userId;
    const isStaffOrAdmin = currentUser.role === "staff" || currentUser.role === "admin";
    if (!isOwn && !isStaffOrAdmin) return res.status(403).json({ message: "Forbidden" });
    const progress = await storage.getProgressByUser(req.params.userId);
    res.json(progress);
  });

  const categoryMaxSessions: Record<string, number> = {
    journey: 104, employment: 11, housing: 8, finance: 8, parenting: 12, community: 4,
  };

  function validateProgressInput(category: unknown, progress: unknown): { error?: string; cat?: string; val?: number } {
    if (!category || typeof category !== "string") return { error: "category is required" };
    const max = categoryMaxSessions[category];
    if (max === undefined) return { error: "invalid category" };
    const val = Number(progress);
    if (progress === undefined || progress === null || !Number.isInteger(val)) return { error: "progress must be an integer" };
    if (val < 0 || val > max) return { error: `progress must be 0-${max}` };
    return { cat: category, val };
  }

  app.put("/api/admin/progress/:userId", requireStaffOrAdmin, async (req, res) => {
    const { category, progress } = req.body;
    const v = validateProgressInput(category, progress);
    if (v.error) return res.status(400).json({ message: v.error });
    const result = await storage.upsertProgress(req.params.userId, v.cat!, v.val!);
    res.json(result);
  });

  app.put("/api/progress/self", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) return res.status(401).json({ message: "Not authenticated" });
    if (currentUser.role !== "client") return res.status(403).json({ message: "Only clients can edit their own progress" });
    const { category, progress } = req.body;
    const v = validateProgressInput(category, progress);
    if (v.error) return res.status(400).json({ message: v.error });
    const result = await storage.upsertProgress(req.session.userId!, v.cat!, v.val!);
    res.json(result);
  });

  app.post("/api/ai-guide/query", requireAuth, async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ message: "query is required" });
    }
    if (query.length > 500) {
      return res.status(400).json({ message: "query too long (max 500 characters)" });
    }
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const result = await handleAiGuideQuery(query.trim(), user.id, user.stage);
    res.json(result);
  });

  app.get("/api/admin/ai/faqs", requireStaffOrAdmin, async (_req, res) => {
    const faqs = await storage.getFaqs();
    res.json(faqs);
  });

  app.post("/api/admin/ai/faqs", requireStaffOrAdmin, async (req, res) => {
    const { question, answer, tags, category, sortOrder, active } = req.body;
    if (!question || !answer) return res.status(400).json({ message: "question and answer required" });
    const faq = await storage.createFaq({
      question, answer,
      tags: tags || [],
      category: category || null,
      sortOrder: sortOrder || 0,
      active: active !== false,
    });
    res.status(201).json(faq);
  });

  app.patch("/api/admin/ai/faqs/:id", requireStaffOrAdmin, async (req, res) => {
    const updated = await storage.updateFaq(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "FAQ not found" });
    res.json(updated);
  });

  app.delete("/api/admin/ai/faqs/:id", requireStaffOrAdmin, async (req, res) => {
    const deleted = await storage.deleteFaq(req.params.id);
    if (!deleted) return res.status(404).json({ message: "FAQ not found" });
    res.json({ success: true });
  });

  app.get("/api/admin/ai/trusted-answers", requireStaffOrAdmin, async (_req, res) => {
    const answers = await storage.getTrustedAnswers();
    res.json(answers);
  });

  app.post("/api/admin/ai/trusted-answers", requireStaffOrAdmin, async (req, res) => {
    const { triggerPhrases, answer, category, active } = req.body;
    if (!triggerPhrases?.length || !answer) return res.status(400).json({ message: "triggerPhrases and answer required" });
    const ta = await storage.createTrustedAnswer({
      triggerPhrases, answer,
      category: category || null,
      active: active !== false,
    });
    res.status(201).json(ta);
  });

  app.patch("/api/admin/ai/trusted-answers/:id", requireStaffOrAdmin, async (req, res) => {
    const updated = await storage.updateTrustedAnswer(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Trusted answer not found" });
    res.json(updated);
  });

  app.delete("/api/admin/ai/trusted-answers/:id", requireStaffOrAdmin, async (req, res) => {
    const deleted = await storage.deleteTrustedAnswer(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Trusted answer not found" });
    res.json({ success: true });
  });

  app.get("/api/admin/ai/crisis-config", requireStaffOrAdmin, async (_req, res) => {
    const config = await storage.getCrisisConfigAdmin();
    res.json(config || null);
  });

  app.put("/api/admin/ai/crisis-config", requireStaffOrAdmin, async (req, res) => {
    const { triggerWords, crisisMessage, crisisResources, notMonitoredDisclaimer, active } = req.body;
    if (!triggerWords?.length || !crisisMessage || !crisisResources || !notMonitoredDisclaimer) {
      return res.status(400).json({ message: "All crisis config fields required" });
    }
    const config = await storage.upsertCrisisConfig({
      triggerWords, crisisMessage, crisisResources, notMonitoredDisclaimer,
      active: active !== false,
    });
    clearCrisisCache();
    res.json(config);
  });

  app.get("/api/admin/ai/query-logs", requireStaffOrAdmin, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const [logs, stats] = await Promise.all([
      storage.getQueryLogs(limit, offset),
      storage.getQueryLogStats(),
    ]);
    res.json({ logs, stats });
  });

  app.get("/api/admin/ai/documents", requireStaffOrAdmin, async (_req, res) => {
    const documents = await storage.getDocuments();
    res.json(documents);
  });

  app.post("/api/admin/ai/documents", requireStaffOrAdmin, documentUpload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const file = req.file;
    const filePath = file.path;

    try {
      const text = await extractText(filePath, file.mimetype);
      if (!text || text.trim().length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: "Could not extract text from file" });
      }

      const chunks = chunkText(text);
      if (chunks.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: "No content chunks could be created from file" });
      }

      let embeddings: number[][] = [];
      try {
        embeddings = await generateEmbeddings(chunks.map(c => c.content));
      } catch (embErr) {
        console.error("[Documents] Embedding generation failed, storing without embeddings:", embErr);
      }

      const fileType = file.mimetype === "application/pdf" ? "pdf" :
                       file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? "docx" : "txt";

      const description = req.body.description || null;
      const tags = req.body.tags ? (typeof req.body.tags === "string" ? req.body.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : req.body.tags) : [];

      const doc = await storage.createDocument({
        fileName: file.filename,
        originalName: file.originalname,
        fileType,
        fileSize: file.size,
        description,
        tags,
        chunkCount: chunks.length,
        active: true,
        uploadedBy: req.session.userId!,
      });

      const chunkRecords = chunks.map((c, i) => ({
        documentId: doc.id,
        content: c.content,
        chunkIndex: c.index,
        metadata: c.metadata,
        embedding: embeddings[i] || null,
      }));

      await storage.createDocumentChunks(chunkRecords);

      res.status(201).json(doc);
    } catch (err: any) {
      console.error("[Documents] Upload processing error:", err);
      try { fs.unlinkSync(filePath); } catch {}
      res.status(500).json({ message: "Failed to process document: " + (err.message || "Unknown error") });
    }
  });

  app.get("/api/admin/ai/documents/:id/chunks", requireStaffOrAdmin, async (req, res) => {
    const chunks = await storage.getDocumentChunks(req.params.id);
    res.json(chunks.map(c => ({ id: c.id, documentId: c.documentId, content: c.content, chunkIndex: c.chunkIndex, metadata: c.metadata, createdAt: c.createdAt })));
  });

  app.patch("/api/admin/ai/documents/:id", requireStaffOrAdmin, async (req, res) => {
    const { description, tags, active } = req.body;
    const updates: any = {};
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    if (active !== undefined) updates.active = active;
    const updated = await storage.updateDocument(req.params.id, updates);
    if (!updated) return res.status(404).json({ message: "Document not found" });
    res.json(updated);
  });

  app.delete("/api/admin/ai/documents/:id", requireStaffOrAdmin, async (req, res) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    try {
      const filePath = path.join(documentsDir, doc.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
    const deleted = await storage.deleteDocument(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Document not found" });
    res.json({ success: true });
  });

  return httpServer;
}
