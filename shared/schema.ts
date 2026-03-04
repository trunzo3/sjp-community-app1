import { sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, boolean, integer, date, time, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["client", "alumni", "staff", "admin"]);
export const stageEnum = pgEnum("stage", ["client", "alumni"]);
export const postTypeEnum = pgEnum("post_type", ["update", "win", "question", "need"]);
export const pillarEnum = pgEnum("pillar", ["community", "confidence", "resilience", "readiness", "wellness"]);
export const resourceTypeEnum = pgEnum("resource_type", ["partner", "program", "service", "opportunity"]);
export const eventTypeEnum = pgEnum("event_type", ["community_meeting", "workshop", "celebration", "class", "partner_session"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "community_only", "revision_requested"]);
export const housingStatusEnum = pgEnum("housing_status", ["stable", "transitional", "unstable"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: roleEnum("role").notNull().default("client"),
  stage: stageEnum("stage").notNull().default("client"),
  graduationDate: date("graduation_date"),
  bio: text("bio"),
  avatarColor: text("avatar_color").notNull().default("#607D8B"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: uuid("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  postType: postTypeEnum("post_type").notNull().default("update"),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const replies = pgTable("replies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").notNull().references(() => posts.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  pillar: pillarEnum("pillar").notNull(),
  type: resourceTypeEnum("type").notNull(),
  providerName: text("provider_name"),
  phone: text("phone"),
  websiteUrl: text("website_url"),
  applicableStages: text("applicable_stages").array().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  location: text("location"),
  description: text("description"),
  applicableStages: text("applicable_stages").array().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reactionTypeEnum = pgEnum("reaction_type", ["heart", "clap", "pray", "fire", "star", "smile"]);

export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: uuid("author_id").notNull().references(() => users.id),
  step1Content: text("step1_content"),
  step2Content: text("step2_content"),
  step3Content: text("step3_content"),
  shareExternally: boolean("share_externally").default(false),
  approvalStatus: approvalStatusEnum("approval_status").default("pending"),
  revisionNote: text("revision_note"),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reactions = pgTable("reactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").notNull().references(() => posts.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  reactionType: reactionTypeEnum("reaction_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("reactions_post_user_idx").on(table.postId, table.userId),
]);

export const surveys = pgTable("surveys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  intervalMonths: integer("interval_months").notNull(),
  stillEmployed: boolean("still_employed"),
  jobTitle: text("job_title"),
  raiseOrPromotion: boolean("raise_or_promotion"),
  promotionDetails: text("promotion_details"),
  housingStatus: housingStatusEnum("housing_status"),
  supportNeeds: text("support_needs"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  pillar: pillarEnum("pillar").notNull(),
  progress: integer("progress").notNull().default(0),
}, (table) => [
  uniqueIndex("user_progress_user_pillar_idx").on(table.userId, table.pillar),
]);

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export const insertReplySchema = createInsertSchema(replies).omit({ id: true, createdAt: true });
export const insertResourceSchema = createInsertSchema(resources).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertStorySchema = createInsertSchema(stories).omit({ id: true, createdAt: true });
export const insertReactionSchema = createInsertSchema(reactions).omit({ id: true, createdAt: true });
export const insertSurveySchema = createInsertSchema(surveys).omit({ id: true, submittedAt: true });
export const insertUserProgressSchema = createInsertSchema(userProgress).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Reply = typeof replies.$inferSelect;
export type InsertReply = z.infer<typeof insertReplySchema>;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
