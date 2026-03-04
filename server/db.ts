import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function ensurePgVector() {
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS ai_document_chunks_embedding_idx 
      ON ai_document_chunks USING hnsw (embedding vector_cosine_ops)
    `);
  } catch (err) {
    console.error("Failed to ensure pgvector extension:", err);
  }
}
