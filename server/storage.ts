import { db } from "./db";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import {
  users, posts, replies, resources, events, stories, reactions, surveys, userProgress, venueLocations,
  aiFaqs, aiTrustedAnswers, aiCrisisConfig, aiQueryLogs, aiDocuments, aiDocumentChunks,
  userActivity, streakAcknowledgments, moodCheckins,
  type User, type InsertUser,
  type Post, type InsertPost,
  type Reply, type InsertReply,
  type Resource, type InsertResource,
  type Event, type InsertEvent,
  type Story, type InsertStory,
  type Reaction, type InsertReaction,
  type Survey, type InsertSurvey,
  type UserProgress, type InsertUserProgress,
  type VenueLocation, type InsertVenueLocation,
  type AiFaq, type InsertAiFaq,
  type AiTrustedAnswer, type InsertAiTrustedAnswer,
  type AiCrisisConfig, type InsertAiCrisisConfig,
  type AiQueryLog, type InsertAiQueryLog,
  type AiDocument, type InsertAiDocument,
  type AiDocumentChunk, type InsertAiDocumentChunk,
  type StreakAcknowledgment,
  type MoodCheckin, type InsertMoodCheckin,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  getPosts(filter?: string): Promise<(Post & { author: User; replies: (Reply & { author: User })[] })[]>;
  getPostsByUser(userId: string): Promise<(Post & { author: User; replies: (Reply & { author: User })[] })[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, data: Partial<InsertPost>): Promise<Post | undefined>;

  createReply(reply: InsertReply): Promise<Reply>;
  getRepliesByPost(postId: string): Promise<(Reply & { author: User })[]>;

  getResources(userStage?: string, pillar?: string): Promise<Resource[]>;
  getAllResources(): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: string, data: Partial<InsertResource>): Promise<Resource | undefined>;
  deleteResource(id: string): Promise<boolean>;

  getEvents(userStage?: string): Promise<Event[]>;
  getAllEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;

  getFeaturedStories(): Promise<(Story & { author: User })[]>;
  getAllShareableStories(): Promise<(Story & { author: User })[]>;
  getStoriesByUser(userId: string): Promise<Story[]>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: string, data: Partial<InsertStory>): Promise<Story | undefined>;
  getPendingStoriesCount(): Promise<number>;

  getReactionsByPost(postId: string): Promise<Reaction[]>;
  getReactionsByUser(userId: string, postId: string): Promise<Reaction | undefined>;
  createReaction(reaction: InsertReaction): Promise<Reaction>;
  deleteReaction(id: string): Promise<boolean>;

  getAllSurveys(): Promise<(Survey & { user: User })[]>;
  getSurveysByUser(userId: string): Promise<Survey[]>;
  createSurvey(survey: InsertSurvey): Promise<Survey>;

  getProgressByUser(userId: string): Promise<UserProgress[]>;
  upsertProgress(userId: string, category: string, progress: number): Promise<UserProgress>;

  getEvent(id: string): Promise<Event | undefined>;
  getStaffUsers(): Promise<User[]>;

  getVenueLocations(): Promise<VenueLocation[]>;
  getVenueLocation(id: string): Promise<VenueLocation | undefined>;
  createVenueLocation(loc: InsertVenueLocation): Promise<VenueLocation>;
  updateVenueLocation(id: string, data: Partial<InsertVenueLocation>): Promise<VenueLocation | undefined>;

  getFaqs(activeOnly?: boolean): Promise<AiFaq[]>;
  createFaq(faq: InsertAiFaq): Promise<AiFaq>;
  updateFaq(id: string, data: Partial<InsertAiFaq>): Promise<AiFaq | undefined>;
  deleteFaq(id: string): Promise<boolean>;

  getTrustedAnswers(activeOnly?: boolean): Promise<AiTrustedAnswer[]>;
  createTrustedAnswer(ta: InsertAiTrustedAnswer): Promise<AiTrustedAnswer>;
  updateTrustedAnswer(id: string, data: Partial<InsertAiTrustedAnswer>): Promise<AiTrustedAnswer | undefined>;
  deleteTrustedAnswer(id: string): Promise<boolean>;

  getCrisisConfig(): Promise<AiCrisisConfig | undefined>;
  getCrisisConfigAdmin(): Promise<AiCrisisConfig | undefined>;
  upsertCrisisConfig(config: InsertAiCrisisConfig): Promise<AiCrisisConfig>;

  createQueryLog(log: InsertAiQueryLog): Promise<AiQueryLog>;
  getQueryLogs(limit?: number, offset?: number): Promise<AiQueryLog[]>;
  getQueryLogStats(): Promise<{ totalQueries: number; noMatchQueries: number; crisisCount: number; topQueries: { query: string; count: number }[] }>;

  getPinnedPosts(): Promise<Post[]>;
  getFutureEvents(userStage?: string): Promise<Event[]>;

  getDocuments(): Promise<AiDocument[]>;
  getDocument(id: string): Promise<AiDocument | undefined>;
  createDocument(doc: InsertAiDocument): Promise<AiDocument>;
  updateDocument(id: string, data: Partial<InsertAiDocument>): Promise<AiDocument | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  createDocumentChunks(chunks: InsertAiDocumentChunk[]): Promise<AiDocumentChunk[]>;
  getDocumentChunks(documentId: string): Promise<AiDocumentChunk[]>;
  deleteDocumentChunks(documentId: string): Promise<boolean>;
  searchDocumentChunksByVector(queryEmbedding: number[], limit?: number): Promise<(AiDocumentChunk & { documentName: string; similarity: number })[]>;
  getActiveDocumentChunks(): Promise<(AiDocumentChunk & { documentName: string })[]>;

  upsertActivity(userId: string, date: string): Promise<{ isNew: boolean }>;
  calculateAndUpdateStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; newMilestone: number | null }>;
  getUnshownAcknowledgment(userId: string): Promise<StreakAcknowledgment | null>;
  markAcknowledgmentShown(id: string): Promise<void>;

  getTodayMoodCheckin(userId: string): Promise<MoodCheckin | null>;
  upsertMoodCheckin(userId: string, data: InsertMoodCheckin): Promise<MoodCheckin>;
  getMoodHistory(userId: string, days: number): Promise<MoodCheckin[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getPosts(filter?: string): Promise<(Post & { author: User; replies: (Reply & { author: User })[] })[]> {
    const allPosts = filter && filter !== "all"
      ? await db.select().from(posts).where(eq(posts.postType, filter as any)).orderBy(desc(posts.createdAt))
      : await db.select().from(posts).orderBy(desc(posts.createdAt));

    const pinnedPosts = await db.select().from(posts).where(eq(posts.pinned, true)).orderBy(desc(posts.createdAt));

    const allPostIds = new Set<string>();
    const orderedPosts: Post[] = [];

    for (const p of pinnedPosts) {
      if (!allPostIds.has(p.id)) {
        allPostIds.add(p.id);
        orderedPosts.push(p);
      }
    }
    for (const p of allPosts) {
      if (!allPostIds.has(p.id)) {
        allPostIds.add(p.id);
        orderedPosts.push(p);
      }
    }

    const result = [];
    for (const post of orderedPosts) {
      const [author] = await db.select().from(users).where(eq(users.id, post.authorId));
      const postReplies = await this.getRepliesByPost(post.id);
      result.push({ ...post, author, replies: postReplies });
    }
    return result;
  }

  async getPostsByUser(userId: string): Promise<(Post & { author: User; replies: (Reply & { author: User })[] })[]> {
    const userPosts = await db.select().from(posts).where(eq(posts.authorId, userId)).orderBy(desc(posts.createdAt));
    const result = [];
    for (const post of userPosts) {
      const [author] = await db.select().from(users).where(eq(users.id, post.authorId));
      const postReplies = await this.getRepliesByPost(post.id);
      result.push({ ...post, author, replies: postReplies });
    }
    return result;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [created] = await db.insert(posts).values(post).returning();
    return created;
  }

  async updatePost(id: string, data: Partial<InsertPost>): Promise<Post | undefined> {
    const [updated] = await db.update(posts).set(data).where(eq(posts.id, id)).returning();
    return updated;
  }

  async createReply(reply: InsertReply): Promise<Reply> {
    const [created] = await db.insert(replies).values(reply).returning();
    return created;
  }

  async getRepliesByPost(postId: string): Promise<(Reply & { author: User })[]> {
    const postReplies = await db.select().from(replies).where(eq(replies.postId, postId)).orderBy(replies.createdAt);
    const result = [];
    for (const reply of postReplies) {
      const [author] = await db.select().from(users).where(eq(users.id, reply.authorId));
      result.push({ ...reply, author });
    }
    return result;
  }

  async getResources(userStage?: string, pillar?: string): Promise<Resource[]> {
    let allResources = await db.select().from(resources).orderBy(desc(resources.createdAt));
    if (userStage) {
      allResources = allResources.filter(r => r.applicableStages.includes(userStage));
    }
    if (pillar && pillar !== "all") {
      allResources = allResources.filter(r => r.pillar === pillar);
    }
    return allResources;
  }

  async getAllResources(): Promise<Resource[]> {
    return db.select().from(resources).orderBy(desc(resources.createdAt));
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [created] = await db.insert(resources).values(resource).returning();
    return created;
  }

  async updateResource(id: string, data: Partial<InsertResource>): Promise<Resource | undefined> {
    const [updated] = await db.update(resources).set(data).where(eq(resources.id, id)).returning();
    return updated;
  }

  async deleteResource(id: string): Promise<boolean> {
    const result = await db.delete(resources).where(eq(resources.id, id)).returning();
    return result.length > 0;
  }

  async getEvents(userStage?: string): Promise<Event[]> {
    let allEvents = await db.select().from(events).orderBy(events.date);
    if (userStage) {
      allEvents = allEvents.filter(e => e.applicableStages.includes(userStage));
    }
    return allEvents;
  }

  async getAllEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(events.date);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    return result.length > 0;
  }

  async getFeaturedStories(): Promise<(Story & { author: User })[]> {
    const featuredStories = await db.select().from(stories).where(
      and(eq(stories.featured, true), eq(stories.approvalStatus, "approved"))
    );
    const communityStories = await db.select().from(stories).where(
      eq(stories.approvalStatus, "community_only")
    );
    const allStories = [...featuredStories, ...communityStories];
    const uniqueMap = new Map<string, Story>();
    for (const s of allStories) uniqueMap.set(s.id, s);

    const result = [];
    for (const story of uniqueMap.values()) {
      const [author] = await db.select().from(users).where(eq(users.id, story.authorId));
      result.push({ ...story, author });
    }
    return result;
  }

  async getAllShareableStories(): Promise<(Story & { author: User })[]> {
    const allStories = await db.select().from(stories).orderBy(desc(stories.createdAt));
    const result = [];
    for (const story of allStories) {
      const [author] = await db.select().from(users).where(eq(users.id, story.authorId));
      result.push({ ...story, author });
    }
    return result;
  }

  async getStoriesByUser(userId: string): Promise<Story[]> {
    return db.select().from(stories).where(eq(stories.authorId, userId));
  }

  async createStory(story: InsertStory): Promise<Story> {
    const [created] = await db.insert(stories).values(story).returning();
    return created;
  }

  async updateStory(id: string, data: Partial<InsertStory>): Promise<Story | undefined> {
    const [updated] = await db.update(stories).set(data).where(eq(stories.id, id)).returning();
    return updated;
  }

  async getPendingStoriesCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(stories).where(eq(stories.approvalStatus, "pending"));
    return Number(result[0].count);
  }

  async getReactionsByPost(postId: string): Promise<Reaction[]> {
    return db.select().from(reactions).where(eq(reactions.postId, postId));
  }

  async getReactionsByUser(userId: string, postId: string): Promise<Reaction | undefined> {
    const [reaction] = await db.select().from(reactions).where(
      and(eq(reactions.userId, userId), eq(reactions.postId, postId))
    );
    return reaction;
  }

  async createReaction(reaction: InsertReaction): Promise<Reaction> {
    const [created] = await db.insert(reactions).values(reaction).returning();
    return created;
  }

  async deleteReaction(id: string): Promise<boolean> {
    const result = await db.delete(reactions).where(eq(reactions.id, id)).returning();
    return result.length > 0;
  }

  async getAllSurveys(): Promise<(Survey & { user: User })[]> {
    const allSurveys = await db.select().from(surveys).orderBy(desc(surveys.submittedAt));
    const result = [];
    for (const survey of allSurveys) {
      const [user] = await db.select().from(users).where(eq(users.id, survey.userId));
      result.push({ ...survey, user });
    }
    return result;
  }

  async getSurveysByUser(userId: string): Promise<Survey[]> {
    return db.select().from(surveys).where(eq(surveys.userId, userId));
  }

  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const [created] = await db.insert(surveys).values(survey).returning();
    return created;
  }

  async getProgressByUser(userId: string): Promise<UserProgress[]> {
    return db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async upsertProgress(userId: string, category: string, progress: number): Promise<UserProgress> {
    const existing = await db.select().from(userProgress).where(
      and(eq(userProgress.userId, userId), eq(userProgress.category, category as any))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(userProgress)
        .set({ progress })
        .where(and(eq(userProgress.userId, userId), eq(userProgress.category, category as any)))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userProgress)
      .values({ userId, category: category as any, progress })
      .returning();
    return created;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getStaffUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers.filter(u => u.role === "staff" || u.role === "admin");
  }

  async getVenueLocations(): Promise<VenueLocation[]> {
    return db.select().from(venueLocations);
  }

  async createVenueLocation(loc: InsertVenueLocation): Promise<VenueLocation> {
    const [created] = await db.insert(venueLocations).values(loc).returning();
    return created;
  }

  async getVenueLocation(id: string): Promise<VenueLocation | undefined> {
    const [venue] = await db.select().from(venueLocations).where(eq(venueLocations.id, id));
    return venue;
  }

  async updateVenueLocation(id: string, data: Partial<InsertVenueLocation>): Promise<VenueLocation | undefined> {
    const [updated] = await db.update(venueLocations).set(data).where(eq(venueLocations.id, id)).returning();
    return updated;
  }

  async getFaqs(activeOnly = false): Promise<AiFaq[]> {
    if (activeOnly) {
      return db.select().from(aiFaqs).where(eq(aiFaqs.active, true)).orderBy(aiFaqs.sortOrder);
    }
    return db.select().from(aiFaqs).orderBy(aiFaqs.sortOrder);
  }

  async createFaq(faq: InsertAiFaq): Promise<AiFaq> {
    const [created] = await db.insert(aiFaqs).values(faq).returning();
    return created;
  }

  async updateFaq(id: string, data: Partial<InsertAiFaq>): Promise<AiFaq | undefined> {
    const [updated] = await db.update(aiFaqs).set(data).where(eq(aiFaqs.id, id)).returning();
    return updated;
  }

  async deleteFaq(id: string): Promise<boolean> {
    const result = await db.delete(aiFaqs).where(eq(aiFaqs.id, id)).returning();
    return result.length > 0;
  }

  async getTrustedAnswers(activeOnly = false): Promise<AiTrustedAnswer[]> {
    if (activeOnly) {
      return db.select().from(aiTrustedAnswers).where(eq(aiTrustedAnswers.active, true)).orderBy(desc(aiTrustedAnswers.createdAt));
    }
    return db.select().from(aiTrustedAnswers).orderBy(desc(aiTrustedAnswers.createdAt));
  }

  async createTrustedAnswer(ta: InsertAiTrustedAnswer): Promise<AiTrustedAnswer> {
    const [created] = await db.insert(aiTrustedAnswers).values(ta).returning();
    return created;
  }

  async updateTrustedAnswer(id: string, data: Partial<InsertAiTrustedAnswer>): Promise<AiTrustedAnswer | undefined> {
    const [updated] = await db.update(aiTrustedAnswers).set(data).where(eq(aiTrustedAnswers.id, id)).returning();
    return updated;
  }

  async deleteTrustedAnswer(id: string): Promise<boolean> {
    const result = await db.delete(aiTrustedAnswers).where(eq(aiTrustedAnswers.id, id)).returning();
    return result.length > 0;
  }

  async getCrisisConfig(): Promise<AiCrisisConfig | undefined> {
    const [config] = await db.select().from(aiCrisisConfig).where(eq(aiCrisisConfig.active, true)).limit(1);
    return config;
  }

  async getCrisisConfigAdmin(): Promise<AiCrisisConfig | undefined> {
    const [config] = await db.select().from(aiCrisisConfig).limit(1);
    return config;
  }

  async upsertCrisisConfig(config: InsertAiCrisisConfig): Promise<AiCrisisConfig> {
    const existing = await this.getCrisisConfigAdmin();
    if (existing) {
      const [updated] = await db.update(aiCrisisConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(aiCrisisConfig.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(aiCrisisConfig).values(config).returning();
    return created;
  }

  async createQueryLog(log: InsertAiQueryLog): Promise<AiQueryLog> {
    const [created] = await db.insert(aiQueryLogs).values(log).returning();
    return created;
  }

  async getQueryLogs(limit = 100, offset = 0): Promise<AiQueryLog[]> {
    return db.select().from(aiQueryLogs).orderBy(desc(aiQueryLogs.createdAt)).limit(limit).offset(offset);
  }

  async getQueryLogStats(): Promise<{ totalQueries: number; noMatchQueries: number; crisisCount: number; topQueries: { query: string; count: number }[] }> {
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(aiQueryLogs);
    const totalQueries = Number(totalResult[0].count);

    const noMatchResult = await db.select({ count: sql<number>`count(*)` }).from(aiQueryLogs)
      .where(eq(aiQueryLogs.matchedContentType, "none"));
    const noMatchQueries = Number(noMatchResult[0].count);

    const crisisResult = await db.select({ count: sql<number>`count(*)` }).from(aiQueryLogs)
      .where(eq(aiQueryLogs.crisisDetected, true));
    const crisisCount = Number(crisisResult[0].count);

    const topQueriesResult = await db.execute(sql`
      SELECT query, COUNT(*)::integer as count 
      FROM ai_query_logs 
      GROUP BY query 
      ORDER BY count DESC 
      LIMIT 20
    `);
    const topQueries = (topQueriesResult.rows as any[]).map(r => ({ query: r.query, count: Number(r.count) }));

    return { totalQueries, noMatchQueries, crisisCount, topQueries };
  }

  async getPinnedPosts(): Promise<Post[]> {
    return db.select().from(posts).where(eq(posts.pinned, true)).orderBy(desc(posts.createdAt));
  }

  async getFutureEvents(userStage?: string): Promise<Event[]> {
    const today = new Date().toISOString().split("T")[0];
    let allEvents = await db.select().from(events).where(gte(events.date, today)).orderBy(events.date);
    if (userStage) {
      allEvents = allEvents.filter(e => e.applicableStages.includes(userStage));
    }
    return allEvents;
  }

  async getDocuments(): Promise<AiDocument[]> {
    return db.select().from(aiDocuments).orderBy(desc(aiDocuments.createdAt));
  }

  async getDocument(id: string): Promise<AiDocument | undefined> {
    const [doc] = await db.select().from(aiDocuments).where(eq(aiDocuments.id, id));
    return doc;
  }

  async createDocument(doc: InsertAiDocument): Promise<AiDocument> {
    const [created] = await db.insert(aiDocuments).values(doc).returning();
    return created;
  }

  async updateDocument(id: string, data: Partial<InsertAiDocument>): Promise<AiDocument | undefined> {
    const [updated] = await db.update(aiDocuments).set(data).where(eq(aiDocuments.id, id)).returning();
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    await db.delete(aiDocumentChunks).where(eq(aiDocumentChunks.documentId, id));
    const result = await db.delete(aiDocuments).where(eq(aiDocuments.id, id)).returning();
    return result.length > 0;
  }

  async createDocumentChunks(chunks: InsertAiDocumentChunk[]): Promise<AiDocumentChunk[]> {
    if (chunks.length === 0) return [];
    const created = await db.insert(aiDocumentChunks).values(chunks).returning();
    return created;
  }

  async getDocumentChunks(documentId: string): Promise<AiDocumentChunk[]> {
    return db.select({
      id: aiDocumentChunks.id,
      documentId: aiDocumentChunks.documentId,
      content: aiDocumentChunks.content,
      chunkIndex: aiDocumentChunks.chunkIndex,
      metadata: aiDocumentChunks.metadata,
      embedding: aiDocumentChunks.embedding,
      createdAt: aiDocumentChunks.createdAt,
    }).from(aiDocumentChunks).where(eq(aiDocumentChunks.documentId, documentId)).orderBy(aiDocumentChunks.chunkIndex);
  }

  async deleteDocumentChunks(documentId: string): Promise<boolean> {
    const result = await db.delete(aiDocumentChunks).where(eq(aiDocumentChunks.documentId, documentId)).returning();
    return result.length > 0;
  }

  async searchDocumentChunksByVector(queryEmbedding: number[], limit = 10): Promise<(AiDocumentChunk & { documentName: string; similarity: number })[]> {
    const embeddingStr = `[${queryEmbedding.join(",")}]`;
    const results = await db.execute(sql`
      SELECT c.id, c.document_id, c.content, c.chunk_index, c.metadata, c.created_at,
             d.original_name as document_name,
             1 - (c.embedding <=> ${embeddingStr}::vector) as similarity
      FROM ai_document_chunks c
      JOIN ai_documents d ON c.document_id = d.id
      WHERE d.active = true AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `);
    return (results.rows as any[]).map(r => ({
      id: r.id,
      documentId: r.document_id,
      content: r.content,
      chunkIndex: r.chunk_index,
      metadata: r.metadata,
      embedding: null,
      createdAt: r.created_at,
      documentName: r.document_name,
      similarity: parseFloat(r.similarity),
    }));
  }

  async getActiveDocumentChunks(): Promise<(AiDocumentChunk & { documentName: string })[]> {
    const results = await db.execute(sql`
      SELECT c.id, c.document_id, c.content, c.chunk_index, c.metadata, c.created_at,
             d.original_name as document_name
      FROM ai_document_chunks c
      JOIN ai_documents d ON c.document_id = d.id
      WHERE d.active = true
    `);
    return (results.rows as any[]).map(r => ({
      id: r.id,
      documentId: r.document_id,
      content: r.content,
      chunkIndex: r.chunk_index,
      metadata: r.metadata,
      embedding: null,
      createdAt: r.created_at,
      documentName: r.document_name,
    }));
  }

  async upsertActivity(userId: string, date: string): Promise<{ isNew: boolean }> {
    const existing = await db.select().from(userActivity).where(
      and(eq(userActivity.userId, userId), eq(userActivity.activityDate, date))
    );
    if (existing.length > 0) return { isNew: false };
    await db.insert(userActivity).values({ userId, activityDate: date });
    return { isNew: true };
  }

  async calculateAndUpdateStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; newMilestone: number | null }> {
    const activities = await db.select({ activityDate: userActivity.activityDate })
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.activityDate));

    if (activities.length === 0) {
      await db.update(users).set({ currentStreak: 0, longestStreak: 0 }).where(eq(users.id, userId));
      return { currentStreak: 0, longestStreak: 0, newMilestone: null };
    }

    const dates = activities.map(a => a.activityDate);
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (dates[0] !== today && dates[0] !== yesterday) {
      const currentStreak = dates[0] === today ? 1 : 0;
      const user = await this.getUser(userId);
      const longestStreak = Math.max(user?.longestStreak || 0, currentStreak);
      await db.update(users).set({ currentStreak, longestStreak }).where(eq(users.id, userId));
      return { currentStreak, longestStreak, newMilestone: null };
    }

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const curr = new Date(dates[i - 1] + "T00:00:00Z");
      const prev = new Date(dates[i] + "T00:00:00Z");
      const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    const user = await this.getUser(userId);
    const longestStreak = Math.max(user?.longestStreak || 0, streak);
    await db.update(users).set({ currentStreak: streak, longestStreak }).where(eq(users.id, userId));

    const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
    let newMilestone: number | null = null;
    if (milestones.includes(streak)) {
      await db.insert(streakAcknowledgments).values({ userId, streakDays: streak, shown: false });
      newMilestone = streak;
    }

    return { currentStreak: streak, longestStreak, newMilestone };
  }

  async getUnshownAcknowledgment(userId: string): Promise<StreakAcknowledgment | null> {
    const [ack] = await db.select().from(streakAcknowledgments)
      .where(and(eq(streakAcknowledgments.userId, userId), eq(streakAcknowledgments.shown, false)))
      .orderBy(desc(streakAcknowledgments.createdAt))
      .limit(1);
    return ack || null;
  }

  async markAcknowledgmentShown(id: string): Promise<void> {
    await db.update(streakAcknowledgments).set({ shown: true }).where(eq(streakAcknowledgments.id, id));
  }

  async getTodayMoodCheckin(userId: string): Promise<MoodCheckin | null> {
    const [checkin] = await db.select().from(moodCheckins)
      .where(and(
        eq(moodCheckins.userId, userId),
        sql`date(${moodCheckins.checkedInAt}) = CURRENT_DATE`
      ));
    return checkin || null;
  }

  async upsertMoodCheckin(userId: string, data: InsertMoodCheckin): Promise<MoodCheckin> {
    const res = await db.execute(sql`
      INSERT INTO mood_checkins (user_id, core_emotion, mid_emotion, outer_emotion, core_color, mid_color, outer_color, outer_label, journal_entry, checked_in_at)
      VALUES (${userId}, ${data.coreEmotion}, ${data.midEmotion}, ${data.outerEmotion}, ${data.coreColor}, ${data.midColor}, ${data.outerColor}, ${data.outerLabel}, ${data.journalEntry ?? null}, NOW())
      ON CONFLICT (user_id, date(checked_in_at))
      DO UPDATE SET
        core_emotion = EXCLUDED.core_emotion,
        mid_emotion = EXCLUDED.mid_emotion,
        outer_emotion = EXCLUDED.outer_emotion,
        core_color = EXCLUDED.core_color,
        mid_color = EXCLUDED.mid_color,
        outer_color = EXCLUDED.outer_color,
        outer_label = EXCLUDED.outer_label,
        journal_entry = EXCLUDED.journal_entry,
        checked_in_at = NOW()
      RETURNING *
    `);
    const rows = (res as any).rows || res;
    const r = Array.isArray(rows) ? rows[0] : rows;
    return {
      id: r.id,
      userId: r.user_id,
      coreEmotion: r.core_emotion,
      midEmotion: r.mid_emotion,
      outerEmotion: r.outer_emotion,
      coreColor: r.core_color,
      midColor: r.mid_color,
      outerColor: r.outer_color,
      outerLabel: r.outer_label,
      journalEntry: r.journal_entry,
      checkedInAt: r.checked_in_at,
    };
  }

  async getMoodHistory(userId: string, days: number): Promise<MoodCheckin[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return db.select().from(moodCheckins)
      .where(and(
        eq(moodCheckins.userId, userId),
        gte(moodCheckins.checkedInAt, since)
      ))
      .orderBy(desc(moodCheckins.checkedInAt));
  }
}

export const storage = new DatabaseStorage();
