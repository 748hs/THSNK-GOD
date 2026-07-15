import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const WordExtractor = require("word-extractor");

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Multer storage in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Lazy loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Robust wrapper to call Gemini API with retries (exponential backoff) and model fallbacks
async function generateContentWithRetry(params: {
  model: string;
  contents: any;
  config?: any;
}): Promise<any> {
  const baseModel = params.model === "gemini-3.5-flash" ? "gemini-2.5-flash" : (params.model || "gemini-2.5-flash");
  const modelsToTry = [baseModel];
  
  if (baseModel !== "gemini-1.5-flash") {
    modelsToTry.push("gemini-1.5-flash");
  }

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const ai = getGeminiClient();
        console.log(`Sending API request to ${modelName} (attempt ${attempt}/3)`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = typeof err === "object" ? JSON.stringify(err) : String(err);
        const errorMessage = String(err.message || errStr || "").toLowerCase();
        
        // Match 503 Service Unavailable, 429 Too Many Requests, Resource Exhausted, Overloaded, Spikes in demand
        const isTransient = 
          errorMessage.includes("503") || 
          errorMessage.includes("unavailable") || 
          errorMessage.includes("429") || 
          errorMessage.includes("rate") || 
          errorMessage.includes("exhausted") ||
          errorMessage.includes("overloaded") ||
          errorMessage.includes("demand") ||
          err.status === 503 ||
          err.status === 429;

        if (isTransient) {
          if (attempt < 3) {
            const delay = attempt * 1500; // 1.5s, then 3s
            console.warn(`Transient error with ${modelName} (attempt ${attempt}): ${err.message || errorMessage}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            console.warn(`Attempt ${attempt} failed with transient error on ${modelName}.`);
          }
        } else {
          // Non-transient errors (e.g., parsing, auth, validation) are thrown immediately
          throw err;
        }
      }
    }
    console.warn(`Model ${modelName} failed after 3 attempts. Attempting fallback model if any...`);
  }

  throw lastError;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// PDF Extraction endpoint
app.post("/api/extract-pdf", upload.single("pdf"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No PDF file was uploaded. Please select a valid PDF file." });
    }

    if (file.mimetype !== "application/pdf" && !file.originalname.endsWith(".pdf")) {
      return res.status(400).json({ error: "Uploaded file is not a PDF. Only PDF files are supported." });
    }

    // 1. Extract text from PDF buffer using pdf-parse
    let pdfData;
    try {
      pdfData = await pdf(file.buffer);
    } catch (parseError: any) {
      console.error("PDF Parsing Error with pdf-parse library:", parseError);
      return res.status(400).json({ error: "Could not read PDF. Please use a text-based PDF or enable OCR" });
    }

    const extractedText = pdfData?.text || "";
    console.log("Extracted text length:", extractedText.trim().length);

    // 2. Validate if text is present. If it is empty or very small, it's probably scanned/image-only
    if (!extractedText || extractedText.trim().length < 150) {
      return res.status(400).json({ error: "Could not read PDF. Please use a text-based PDF or enable OCR" });
    }

    // 3. Structure text with Gemini
    const prompt = `You are an expert school examination parser. Analyze the following raw text extracted from an exam PDF and parse exactly the first 30 multiple-choice questions.

Look for question numbers or labels like "1.", "2.", "Q1:", etc.
For each question, extract:
1. The question text (excluding question numbers/prefixes like "1.", "Q1:", etc.).
2. Exactly four multiple-choice options as plain text strings (remove prefixes like "A)", "B.", "C)", etc.).
3. The correct answer option: 'A', 'B', 'C', or 'D'. Deduce the correct answer from the context, or use the answer key if included.

Ignore instructions, headers, footers, page numbers, or general formatting text. Copy the questions exactly as they appear in terms of wording and spelling. Do not rewrite, modify, or summarize the questions.

Extracted PDF Exam Text:
"""
${extractedText}
"""`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of extracted questions",
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING, description: "The content/text of the question" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 options"
              },
              correctOption: { type: Type.STRING, description: "The correct option: must be 'A', 'B', 'C', or 'D'" }
            },
            required: ["questionText", "options", "correctOption"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No text response received from Gemini API.");
    }

    const questions = JSON.parse(resultText.trim());
    return res.json({ success: true, questions });
  } catch (error: any) {
    console.error("PDF extraction error:", error);
    return res.status(500).json({
      error: error.message || "Failed to process the PDF examination. Please try again."
    });
  }
});

// Helper to extract plain text from Rich Text Format (RTF)
function convertRTFToText(rtf: string): string {
  if (!rtf) return "";
  
  // 1. Unescape hex characters like \'3f
  let clean = rtf.replace(/\\'[0-9a-fA-F]{2}/g, (match) => {
    return String.fromCharCode(parseInt(match.substring(2), 16));
  });

  // 2. Remove RTF metadata and header blocks if present, e.g. {\fonttbl...}, {\colortbl...}, {\stylesheet...}, {\info...}
  clean = clean.replace(/\{\\fonttbl[\s\S]*?\}/g, "");
  clean = clean.replace(/\{\\colortbl[\s\S]*?\}/g, "");
  clean = clean.replace(/\{\\stylesheet[\s\S]*?\}/g, "");
  clean = clean.replace(/\{\\info[\s\S]*?\}/g, "");

  // 3. Remove groups containing control words starting with *
  clean = clean.replace(/\{\\\*[\s\S]*?\}/g, "");

  // 4. Remove standard RTF control words/commands like \par, \b, \i, \cf, \fs, \f, etc.
  clean = clean.replace(/\\[a-zA-Z]+-?[0-9]* ?/g, " ");

  // 5. Remove opening/closing braces
  clean = clean.replace(/[{}]/g, "");

  // 6. Clean up excessive whitespace/newlines
  clean = clean.replace(/[ \t]+/g, " ");
  clean = clean.replace(/\r\n/g, "\n");
  clean = clean.replace(/\n\s*\n/g, "\n");

  return clean.trim();
}

// Robust Document Extraction endpoint (Supports PDF, DOCX, DOC, RTF, and TXT)
app.post("/api/extract-document", upload.any(), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const file = files && files[0];
    if (!file) {
      return res.status(400).json({ error: "Could not read document. Try a valid PDF, Word, RTF or Text file." });
    }

    const filename = file.originalname.toLowerCase();
    let extractedText = "";

    if (file.mimetype === "application/pdf" || filename.endsWith(".pdf")) {
      // 1. Extract text from PDF buffer using pdf-parse
      try {
        const pdfData = await pdf(file.buffer);
        extractedText = pdfData?.text || "";
      } catch (parseError: any) {
        console.error("PDF Parsing Error with pdf-parse library:", parseError);
        return res.status(400).json({ error: "The uploaded PDF file is corrupted or cannot be read." });
      }
    } else if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      file.mimetype === "application/msword" ||
      filename.endsWith(".docx") ||
      filename.endsWith(".doc")
    ) {
      // 2. Extract text from Word document using word-extractor
      try {
        const extractor = new WordExtractor();
        const docObj = await extractor.extract(file.buffer);
        extractedText = docObj.getBody() || "";
      } catch (parseError: any) {
        console.error("Word Document Parsing Error with word-extractor:", parseError);
        // Fallback to mammoth for .docx if word-extractor had an issue
        if (filename.endsWith(".docx")) {
          try {
            const docxData = await mammoth.extractRawText({ buffer: file.buffer });
            extractedText = docxData?.value || "";
          } catch (mError) {
            return res.status(400).json({ error: "The uploaded Word document is corrupted or cannot be read." });
          }
        } else {
          return res.status(400).json({ error: "The uploaded Word document is corrupted or cannot be read." });
        }
      }
    } else if (filename.endsWith(".rtf") || file.mimetype === "application/rtf" || file.mimetype === "text/rtf") {
      // 3. Extract text from RTF buffer
      try {
        const rtfRaw = file.buffer.toString("utf-8");
        extractedText = convertRTFToText(rtfRaw);
      } catch (parseError: any) {
        console.error("RTF Parsing Error:", parseError);
        return res.status(400).json({ error: "The uploaded RTF document is corrupted or cannot be read." });
      }
    } else if (filename.endsWith(".txt") || file.mimetype === "text/plain") {
      // 4. Extract text from plain text buffer
      try {
        extractedText = file.buffer.toString("utf-8");
      } catch (parseError: any) {
        console.error("Plain Text Parsing Error:", parseError);
        return res.status(400).json({ error: "The uploaded plain text file is corrupted or cannot be read." });
      }
    } else {
      return res.status(400).json({ 
        error: "Unsupported file format. Please upload a PDF (.pdf), Word document (.docx/.doc), RTF (.rtf), or Text (.txt) file." 
      });
    }

    console.log("Extracted text length:", extractedText.trim().length);

    // Validate extracted text length. If empty or too short, it's scanned/empty
    if (!extractedText || extractedText.trim().length < 20) {
      return res.status(400).json({ 
        error: "No readable text could be extracted from the document. Please verify the document has actual text content or try a different file." 
      });
    }

    // Structure text with Gemini
    const prompt = `You are an expert school examination parser. Analyze the following raw text extracted from an exam document and parse exactly the first 30 multiple-choice questions.

Look for question numbers or labels like "1.", "2.", "Q1:", etc.
For each question, extract:
1. The question text (excluding question numbers/prefixes like "1.", "Q1:", etc.).
2. The multiple-choice options as plain text strings (remove prefixes like "A)", "B.", "C)", etc.). Support any number of options per question (e.g. 2 options for True/False, 3, 4, 5, etc.).
3. The correct answer option: 'A', 'B', 'C', 'D', 'E', 'F', etc. based on the list of options. Deduce the correct answer from the context, or use the answer key if included.

Ignore instructions, headers, footers, page numbers, or general formatting text. Copy the questions exactly as they appear in terms of wording and spelling. Do not rewrite, modify, or summarize the questions.

Extracted Document Exam Text:
"""
${extractedText}
"""`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of extracted questions",
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING, description: "The content/text of the question" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of options (can be any number of options)"
              },
              correctOption: { type: Type.STRING, description: "The correct option letter: e.g., 'A', 'B', 'C', 'D', 'E', etc." }
            },
            required: ["questionText", "options", "correctOption"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No text response received from Gemini API.");
    }

    const questions = JSON.parse(resultText.trim());
    return res.json({ success: true, questions });
  } catch (error: any) {
    console.error("Document extraction error:", error);
    return res.status(500).json({
      error: "Could not read document. Try a text-based PDF or Word file."
    });
  }
});

// Parse raw text endpoint (used for client-side PDF text extraction fallback/primary flow)
app.post("/api/parse-exam-text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "No text data was provided. Please make sure the text input is not empty." });
    }

    if (text.trim().length < 20) {
      return res.status(400).json({ error: "The provided text is too short. Please make sure it has actual text content or try a different file." });
    }

    const prompt = `You are an expert school examination parser. Analyze the following raw text extracted from an exam PDF and parse exactly the first 30 multiple-choice questions.

Look for question numbers or labels like "1.", "2.", "Q1:", etc.
For each question, extract:
1. The question text (excluding question numbers/prefixes like "1.", "Q1:", etc.).
2. The multiple-choice options as plain text strings (remove prefixes like "A)", "B.", "C)", etc.). Support any number of options per question (e.g. 2 options for True/False, 3, 4, 5, etc.).
3. The correct answer option: 'A', 'B', 'C', 'D', 'E', 'F', etc. based on the list of options. Deduce the correct answer from the context, or if there is an answer key included in the text, extract the corresponding answer.

Ignore instructions, headers, footers, page numbers, or general formatting text. Copy the questions exactly as they appear in terms of wording and spelling. Do not rewrite, modify, or summarize the questions.

Extracted PDF Exam Text:
"""
${text}
"""`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of extracted questions",
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING, description: "The content/text of the question" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of options (can be any number of options)"
              },
              correctOption: { type: Type.STRING, description: "The correct option letter: e.g., 'A', 'B', 'C', 'D', 'E', etc." }
            },
            required: ["questionText", "options", "correctOption"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No text response received from Gemini API.");
    }

    const questions = JSON.parse(resultText.trim());
    return res.json({ success: true, questions });
  } catch (error: any) {
    console.error("Parse text error:", error);
    return res.status(500).json({
      error: "Could not read document. Try a text-based PDF or Word file."
    });
  }
});

// AI Backup Generator endpoint
app.post("/api/generate-ai-exam", async (req, res) => {
  try {
    const { subject, grade, topic, count = 30 } = req.body;
    if (!subject || !grade) {
      return res.status(400).json({ error: "Subject and Grade/Class are required to generate an examination." });
    }

    const prompt = `Generate exactly ${count} professional and curriculum-aligned multiple-choice questions for the following details:
- Subject: ${subject}
- Grade/Class: ${grade}
- Topic: ${topic || "General Curriculum"}

Each question must have:
1. Question text (clear and appropriate for the grade level, no question numbers).
2. Exactly 4 multiple choice options.
3. A correct option ('A', 'B', 'C', or 'D') indicating which index contains the correct answer.

The exam must feel highly professional, suitable for the specified grade level. Format output as a JSON array of questions matching the schema.`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of generated questions",
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING, description: "The text of the question" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 options"
              },
              correctOption: { type: Type.STRING, description: "The correct option: must be 'A', 'B', 'C', or 'D'" }
            },
            required: ["questionText", "options", "correctOption"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from the question generator.");
    }

    const questions = JSON.parse(resultText.trim());
    return res.json({ success: true, questions });
  } catch (error: any) {
    console.error("AI question generation error:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate AI examination. Please verify your Gemini API configuration and try again."
    });
  }
});

// Global JSON error handler to ensure we never return HTML pages for failures
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global express error handler caught:", err);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    error: err.message || "Could not read document. Try a text-based PDF or Word file."
  });
});

// Vite Middleware & Static Asset Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static files serving enabled.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Maranatha Examination Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
