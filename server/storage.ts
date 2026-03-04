import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  users, posts, replies, resources, events, stories, reactions, surveys, userProgress,
  type User, type InsertUser,
  type Post, type InsertPost,
  type Reply, type InsertReply,
  type Resource, type InsertResource,
  type Event, type InsertEvent,
  type Story, type InsertStory,
  type Reaction, type InsertReaction,
  type Survey, type InsertSurvey,
  type UserProgress, type InsertUserProgress,
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
  upsertProgress(userId: string, pillar: string, progress: number): Promise<UserProgress>;
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

  async upsertProgress(userId: string, pillar: string, progress: number): Promise<UserProgress> {
    const existing = await db.select().from(userProgress).where(
      and(eq(userProgress.userId, userId), eq(userProgress.pillar, pillar as any))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(userProgress)
        .set({ progress })
        .where(and(eq(userProgress.userId, userId), eq(userProgress.pillar, pillar as any)))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userProgress)
      .values({ userId, pillar: pillar as any, progress })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
