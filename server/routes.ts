import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function stripPasswords(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripPasswords);
  if (obj instanceof Date) return obj;
  if (obj && typeof obj === "object") {
    const { password, ...rest } = obj;
    return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, stripPasswords(v)]));
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
    const safe = allUsers.map(({ password, ...u }) => u);
    res.json(safe);
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    if (!currentUser) return res.status(401).json({ message: "Not authenticated" });
    const isOwn = req.session.userId === req.params.id;
    const isAdmin = currentUser.role === "admin";
    if (!isOwn && !isAdmin) return res.status(403).json({ message: "Forbidden" });
    const updated = await storage.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.get("/api/posts", requireAuth, async (req, res) => {
    const filter = req.query.filter as string | undefined;
    const postsData = await storage.getPosts(filter);
    res.json(stripPasswords(postsData));
  });

  app.get("/api/posts/user/:userId", requireAuth, async (req, res) => {
    const postsData = await storage.getPostsByUser(req.params.userId);
    res.json(stripPasswords(postsData));
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    const post = await storage.createPost({ ...req.body, authorId: req.session.userId });
    res.json(post);
  });

  app.patch("/api/posts/:id", requireStaffOrAdmin, async (req, res) => {
    const updated = await storage.updatePost(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Post not found" });
    res.json(updated);
  });

  app.post("/api/replies", requireAuth, async (req, res) => {
    const reply = await storage.createReply({ ...req.body, authorId: req.session.userId });
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

  app.get("/api/events", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const isStaffOrAdmin = user.role === "staff" || user.role === "admin";
    const eventsData = await storage.getEvents(isStaffOrAdmin ? undefined : user.stage);
    res.json(eventsData);
  });

  app.get("/api/admin/events", requireStaffOrAdmin, async (_req, res) => {
    const allEvents = await storage.getAllEvents();
    res.json(allEvents);
  });

  app.post("/api/events", requireStaffOrAdmin, async (req, res) => {
    const event = await storage.createEvent({ ...req.body, createdBy: req.session.userId });
    res.json(event);
  });

  app.patch("/api/events/:id", requireStaffOrAdmin, async (req, res) => {
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
    res.json(stripPasswords(featuredStories));
  });

  app.get("/api/stories/pending-count", requireAuth, async (_req, res) => {
    const count = await storage.getPendingStoriesCount();
    res.json({ count });
  });

  app.get("/api/admin/stories", requireStaffOrAdmin, async (_req, res) => {
    const allStories = await storage.getAllShareableStories();
    res.json(stripPasswords(allStories));
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

  app.patch("/api/stories/:id", requireStaffOrAdmin, async (req, res) => {
    const updated = await storage.updateStory(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Story not found" });
    res.json(updated);
  });

  app.get("/api/admin/surveys", requireStaffOrAdmin, async (_req, res) => {
    const allSurveys = await storage.getAllSurveys();
    res.json(stripPasswords(allSurveys));
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

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const { role, stage, graduationDate } = req.body;
    const updateData: any = {};
    if (role) updateData.role = role;
    if (stage) updateData.stage = stage;
    if (graduationDate !== undefined) updateData.graduationDate = graduationDate;
    const updated = await storage.updateUser(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  });

  return httpServer;
}
