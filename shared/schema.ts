import { sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, boolean, integer, date, time, pgEnum, uniqueIndex, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

export const roleEnum = pgEnum("role", ["client", "alumni", "staff", "admin"]);
export const stageEnum = pgEnum("stage", ["client", "alumni"]);
export const postTypeEnum = pgEnum("post_type", ["update", "win", "question", "need", "milestone"]);
export const pillarEnum = pgEnum("pillar", ["community", "confidence", "resilience", "readiness", "wellness"]);
export const categoryEnum = pgEnum("category", ["journey", "employment", "housing", "finance", "parenting", "community"]);
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
  milestoneType: text("milestone_type"),
  milestoneCategory: text("milestone_category"),
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
  venuePhotoUrl: text("venue_photo_url"),
  hostUserId: uuid("host_user_id").references(() => users.id),
  applicableStages: text("applicable_stages").array().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const venueLocations = pgTable("venue_locations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  photoUrl: text("photo_url").notNull(),
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
  category: categoryEnum("category").notNull(),
  progress: integer("progress").notNull().default(0),
}, (table) => [
  uniqueIndex("user_progress_user_category_idx").on(table.userId, table.category),
]);

export const aiFaqs = pgTable("ai_faqs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  tags: text("tags").array().notNull(),
  category: text("category"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiTrustedAnswers = pgTable("ai_trusted_answers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  triggerPhrases: text("trigger_phrases").array().notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiCrisisConfig = pgTable("ai_crisis_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  triggerWords: text("trigger_words").array().notNull(),
  crisisMessage: text("crisis_message").notNull(),
  crisisResources: text("crisis_resources").notNull(),
  notMonitoredDisclaimer: text("not_monitored_disclaimer").notNull(),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiQueryLogs = pgTable("ai_query_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  query: text("query").notNull(),
  matchedContentType: text("matched_content_type"),
  matchedContentId: uuid("matched_content_id"),
  confidence: integer("confidence").notNull().default(0),
  responseGenerated: boolean("response_generated").notNull().default(false),
  crisisDetected: boolean("crisis_detected").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiDocuments = pgTable("ai_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  description: text("description"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  chunkCount: integer("chunk_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiDocumentChunks = pgTable("ai_document_chunks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid("document_id").notNull().references(() => aiDocuments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  metadata: text("metadata"),
  embedding: vector("embedding"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export const insertReplySchema = createInsertSchema(replies).omit({ id: true, createdAt: true });
export const insertResourceSchema = createInsertSchema(resources).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertStorySchema = createInsertSchema(stories).omit({ id: true, createdAt: true });
export const insertReactionSchema = createInsertSchema(reactions).omit({ id: true, createdAt: true });
export const insertSurveySchema = createInsertSchema(surveys).omit({ id: true, submittedAt: true });
export const insertUserProgressSchema = createInsertSchema(userProgress).omit({ id: true });
export const insertVenueLocationSchema = createInsertSchema(venueLocations).omit({ id: true });

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
export type VenueLocation = typeof venueLocations.$inferSelect;
export type InsertVenueLocation = z.infer<typeof insertVenueLocationSchema>;

export const insertAiFaqSchema = createInsertSchema(aiFaqs).omit({ id: true, createdAt: true });
export const insertAiTrustedAnswerSchema = createInsertSchema(aiTrustedAnswers).omit({ id: true, createdAt: true });
export const insertAiCrisisConfigSchema = createInsertSchema(aiCrisisConfig).omit({ id: true, updatedAt: true });
export const insertAiQueryLogSchema = createInsertSchema(aiQueryLogs).omit({ id: true, createdAt: true });

export type AiFaq = typeof aiFaqs.$inferSelect;
export type InsertAiFaq = z.infer<typeof insertAiFaqSchema>;
export type AiTrustedAnswer = typeof aiTrustedAnswers.$inferSelect;
export type InsertAiTrustedAnswer = z.infer<typeof insertAiTrustedAnswerSchema>;
export type AiCrisisConfig = typeof aiCrisisConfig.$inferSelect;
export type InsertAiCrisisConfig = z.infer<typeof insertAiCrisisConfigSchema>;
export type AiQueryLog = typeof aiQueryLogs.$inferSelect;
export type InsertAiQueryLog = z.infer<typeof insertAiQueryLogSchema>;

export const insertAiDocumentSchema = createInsertSchema(aiDocuments).omit({ id: true, createdAt: true });
export const insertAiDocumentChunkSchema = createInsertSchema(aiDocumentChunks).omit({ id: true, createdAt: true });

export type AiDocument = typeof aiDocuments.$inferSelect;
export type InsertAiDocument = z.infer<typeof insertAiDocumentSchema>;
export type AiDocumentChunk = typeof aiDocumentChunks.$inferSelect;
export type InsertAiDocumentChunk = z.infer<typeof insertAiDocumentChunkSchema>;
