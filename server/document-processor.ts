import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface TextChunk {
  content: string;
  index: number;
  metadata: string;
}

export async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === "text/plain") {
    return fs.readFileSync(filePath, "utf-8");
  }

  if (mimeType === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

export function chunkText(text: string, chunkSize = 800, overlap = 100): TextChunk[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (currentChunk.length + trimmedPara.length + 2 > chunkSize && currentChunk.length > 0) {
      const metadata = extractMetadata(currentChunk);
      chunks.push({ content: currentChunk.trim(), index: chunkIndex, metadata });
      chunkIndex++;

      if (overlap > 0 && currentChunk.length > overlap) {
        const words = currentChunk.split(/\s+/);
        const overlapWords: string[] = [];
        let overlapLen = 0;
        for (let i = words.length - 1; i >= 0 && overlapLen < overlap; i--) {
          overlapWords.unshift(words[i]);
          overlapLen += words[i].length + 1;
        }
        currentChunk = overlapWords.join(" ") + "\n\n" + trimmedPara;
      } else {
        currentChunk = trimmedPara;
      }
    } else {
      currentChunk = currentChunk ? currentChunk + "\n\n" + trimmedPara : trimmedPara;
    }
  }

  if (currentChunk.trim()) {
    const metadata = extractMetadata(currentChunk);
    chunks.push({ content: currentChunk.trim(), index: chunkIndex, metadata });
  }

  return chunks;
}

function extractMetadata(text: string): string {
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length <= 100) return firstLine;
  return firstLine.substring(0, 97) + "...";
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });

    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  return response.data[0].embedding;
}
