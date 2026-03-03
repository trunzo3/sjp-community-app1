import { db } from "./db";
import { eq, desc, and, sql, arrayContains } from "drizzle-orm";
import {
  users, posts, replies, resources, events, stories, surveys,
  type User, type InsertUser,
  type Post, type InsertPost,
  type Reply, type InsertReply,
  type Resource, type InsertResource,
  type Event, type InsertEvent,
  type Story, type InsertStory,
  type Survey, type InsertSurvey,
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
  createResource(resource: InsertResource): Promise<Resource>;

  getEvents(userStage?: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;

  getFeaturedStories(): Promise<(Story & { author: User })[]>;
  getStoriesByUser(userId: string): Promise<Story[]>;
  createStory(story: InsertStory): Promise<Story>;
  getPendingStoriesCount(): Promise<number>;

  getSurveysByUser(userId: string): Promise<Survey[]>;
  createSurvey(survey: InsertSurvey): Promise<Survey>;
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
    let query = db.select().from(posts).orderBy(desc(posts.createdAt));
    const allPosts = filter && filter !== "all"
      ? await db.select().from(posts).where(eq(posts.postType, filter as any)).orderBy(desc(posts.createdAt))
      : await query;

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
    let allResources = await db.select().from(resources).orderBy(resources.createdAt);
    if (userStage) {
      allResources = allResources.filter(r => r.applicableStages.includes(userStage));
    }
    if (pillar && pillar !== "all") {
      allResources = allResources.filter(r => r.pillar === pillar);
    }
    return allResources;
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [created] = await db.insert(resources).values(resource).returning();
    return created;
  }

  async getEvents(userStage?: string): Promise<Event[]> {
    let allEvents = await db.select().from(events).orderBy(events.date);
    if (userStage) {
      allEvents = allEvents.filter(e => e.applicableStages.includes(userStage));
    }
    return allEvents;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async getFeaturedStories(): Promise<(Story & { author: User })[]> {
    const featuredStories = await db.select().from(stories).where(eq(stories.featured, true));
    const result = [];
    for (const story of featuredStories) {
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

  async getPendingStoriesCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(stories).where(eq(stories.approvalStatus, "pending"));
    return Number(result[0].count);
  }

  async getSurveysByUser(userId: string): Promise<Survey[]> {
    return db.select().from(surveys).where(eq(surveys.userId, userId));
  }

  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const [created] = await db.insert(surveys).values(survey).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
