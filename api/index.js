import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import path from "path";
const _dirname = path.resolve();

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(bodyParser.json());

let geminiClient = null;
if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY not set. Gemini calls will fail.");
} else {
  try {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (err) {
    console.error("❌ Failed to initialize Gemini client:", err?.message || err);
    geminiClient = null;
  }
}

function extractTextFromGeminiResponse(resp) {
  if (!resp) return null;
  if (typeof resp.text === "string" && resp.text.trim()) return resp.text.trim();
  if (Array.isArray(resp?.candidates) && resp.candidates.length > 0) {
    const cand = resp.candidates[0];
    if (Array.isArray(cand?.content?.parts)) {
      const combined = cand.content.parts
        .map((p) => (typeof p === "string" ? p : p?.text || ""))
        .join("");
      if (combined.trim()) return combined.trim();
    }
    if (typeof cand?.text === "string" && cand.text.trim()) return cand.text.trim();
  }
  return null;
}

async function callGeminiPrompt(promptText, model = "gemini-2.5-flash") {
  if (!geminiClient) {
    const e = new Error("Gemini client not configured (set GEMINI_API_KEY in .env)");
    e.isConfigError = true;
    throw e;
  }

  const resp = await geminiClient.models.generateContent({
    model,
    contents: promptText,
  });
  const text = extractTextFromGeminiResponse(resp);
  if (!text) throw new Error("Gemini produced no usable text.");
  return text;
}

function SINGLE_SHOT_PROMPT(topic, wordCount = 1000) {
  return `You are an expert blog writer.

Write a complete blog post on the topic: "${topic}".
Your output must strictly follow this Markdown format:

# {Blog Title}

## Introduction
(2–3 paragraphs)

## Table of Contents
(Numbered list of sections)

## Section 1: {Title}
(2–3 paragraphs with bullet points if useful)

## Section 2: {Title}
(2–3 paragraphs, may include subsections)

## Section 3: {Title}
(2–3 paragraphs, comparisons, best practices, or pitfalls)

## Conclusion
(Summarize key points, end with insights or call-to-action)

Rules:
- Length: ~${wordCount} words
- Always use proper Markdown headers (#, ##, ###)
- Do not include anything outside the blog content.`;
}

app.post("/api/generate-blog", async (req, res) => {
  try {
    const { topic, wordCount = 1000 } = req.body || {};
    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return res.status(400).json({ error: "topic is required and should be a short string" });
    }

    const prompt = SINGLE_SHOT_PROMPT(topic, wordCount);
    const markdown = await callGeminiPrompt(prompt, "gemini-2.5-flash");
    return res.json({ topic, markdown });
  } catch (err) {
    console.error("generate-blog error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

app.use(express.static(path.join(_dirname,"/client/dist")));
app.get('/*\w',(req,res)=>{
    res.sendFile(path.resolve(_dirname,"client","dist","index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Gemini blog server running at http://localhost:${port}`);
});
