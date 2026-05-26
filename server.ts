import express from "express";
import path from "path";
import dotenv from "dotenv";
import midtransClient from "midtrans-client";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const deepSeekApiKey = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY || process.env.OPENROUTER_API_KEY;
const isOpenRouterKey = deepSeekApiKey?.startsWith("sk-or-");
const aiBaseUrl = (process.env.DEEPSEEK_BASE_URL || process.env.OPENROUTER_BASE_URL || (isOpenRouterKey ? "https://openrouter.ai/api/v1" : "https://api.deepseek.com")).replace(/\/$/, "");
const aiModel = process.env.DEEPSEEK_MODEL || process.env.OPENROUTER_MODEL || (isOpenRouterKey ? "deepseek/deepseek-chat" : "deepseek-chat");

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = fenced?.[1]?.trim() || trimmed;

  try {
    return JSON.parse(raw);
  } catch {
    const firstArray = raw.indexOf("[");
    const firstObject = raw.indexOf("{");
    const start = firstArray === -1 ? firstObject : firstObject === -1 ? firstArray : Math.min(firstArray, firstObject);
    const end = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));

    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }

    throw new Error("Respons AI bukan JSON yang valid.");
  }
}

async function callAIJson<T>(messages: ChatMessage[], defaultMsg: string): Promise<T> {
  if (!deepSeekApiKey) {
    throw new Error("DEEPSEEK_API_KEY belum diatur di file .env.");
  }

  const response = await fetch(`${aiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${deepSeekApiKey}`,
      ...(isOpenRouterKey ? {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Edugrade AI"
      } : {})
    },
    body: JSON.stringify({
      model: aiModel,
      messages,
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || data?.message || defaultMsg;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Respons AI kosong.");
  }

  return extractJson(content) as T;
}

// Helper: Common AI Error Handler
function handleAIError(error: any, res: any, defaultMsg: string) {
  console.error(`${defaultMsg}:`, error);
  
  let errorMessage = defaultMsg;
  let retryAfter = 0;
  
  const isQuotaError = error.message?.toLowerCase?.().includes("quota") || 
                      error.status === 429 || 
                      error.message?.includes("RESOURCE_EXHAUSTED");

  if (isQuotaError) {
    errorMessage = "Batas penggunaan AI gratis (Quota) telah tercapai. Silakan coba lagi dalam beberapa saat.";
    
    // Try to extract retry delay from error message
    const retryMatch = error.message?.match(/retryDelay":"(\d+)(\.\d+)?s"/) || 
                       error.message?.match(/Please retry in (\d+)(\.\d+)?s/);
    if (retryMatch) {
      retryAfter = Math.ceil(parseFloat(retryMatch[1]));
      errorMessage = `Batas penggunaan AI gratis (Quota) telah tercapai. Harap tunggu ${retryAfter} detik sebelum mencoba lagi.`;
    } else if (error.message?.includes("minute")) {
      errorMessage = "Batas penggunaan AI gratis (Quota) telah tercapai. Silakan coba lagi dalam 1-2 menit.";
    }
  } else {
    errorMessage = error.message || defaultMsg;
  }

  res.status(isQuotaError ? 429 : (error.status || 500)).json({ 
    error: errorMessage,
    retryAfter: retryAfter > 0 ? retryAfter : undefined
  });
}

// API: Generate Questions
app.post("/api/generate-questions", async (req, res) => {
  try {
    const { topic, count, type, educationLevel, grade, referenceMaterial, questionConfigs, optionCount = 4 } = req.body;
    
    const configPrompt = questionConfigs && Array.isArray(questionConfigs)
      ? `Specific configurations for each question must be strictly followed:
${questionConfigs.map((cfg: any, i: number) => `Question ${i+1}: Bloom Level ${cfg.level}, Type ${cfg.type}`).join("\n")}`
      : `Specific Bloom's Taxonomy levels requested for each question:
${(req.body.requestedLevels || []).map((lvl: string, i: number) => `Question ${i+1}: ${lvl}`).join("\n")}`;

    const prompt = `Generate ${count} educational questions for the topic: "${topic}". 
    Target Level: ${educationLevel} (Kelas/Semester: ${grade}).
    ${configPrompt}
    
    ${referenceMaterial ? `IMPORTANT: Base the questions and options strictly on the following reference material provided by the teacher:\n"""\n${referenceMaterial}\n"""` : ""}

    Ensure questions are clear, pedagogically sound, and follow the specified taxonomy levels and types accurately.
    The language and difficulty should be appropriate for ${educationLevel} Grade/Semester ${grade}.
    Make the questions highly engaging, analytical, challenging, and practical rather than purely theoretical. Use real-world scenarios or complex problem-solving contexts where appropriate.
    For multiple choice questions, provide exactly ${optionCount} options with one correct answer.
    Do not create image prompts, image URLs, diagrams, or visual aid metadata.

    Return JSON only with this shape:
    {
      "questions": [
        {
          "question": "string",
          "taxonomy": "C1|C2|C3|C4|C5|C6",
          "type": "Multiple Choice|Essay",
          "options": [{"label": "A", "text": "string", "isCorrect": true}],
          "explanation": "string"
        }
      ]
    }

    For Essay questions, omit "options" or return an empty array.
    Output languages (question, options, explanation) should match the input topic's language (Indonesian).`;

    const result = await callAIJson<{ questions: any[] }>([
      {
        role: "system",
        content: "You are an expert Indonesian education assessment designer. Always return valid JSON only."
      },
      { role: "user", content: prompt }
    ], "Gagal menghasilkan soal");

    const questions = Array.isArray(result) ? result : result.questions;
    res.json(questions);
  } catch (error: any) {
    handleAIError(error, res, "Gagal menghasilkan soal");
  }
});

// API: Generate Follow-up Question
app.post("/api/generate-followup", async (req, res) => {
  try {
    const { originalQuestion, topic, educationLevel, grade, optionCount = 4 } = req.body;
    
    const prompt = `Based on this educational question:
    "${originalQuestion.question}"
    
    Generate 1 follow-up question that explores a deeper concept, asks for application in a different context, or provides a related challenge.
    Topic: "${topic}"
    Target Level: ${educationLevel} (Grade: ${grade})
    
    Type: ${originalQuestion.type}
    If Multiple Choice, use ${optionCount} options.
    
    Do not create image prompts, image URLs, diagrams, or visual aid metadata.
    Return JSON only with this shape:
    {
      "question": "string",
      "taxonomy": "C1|C2|C3|C4|C5|C6",
      "type": "Multiple Choice|Essay",
      "options": [{"label": "A", "text": "string", "isCorrect": true}],
      "explanation": "string"
    }
    For Essay questions, omit "options" or return an empty array.
    Output languages should match the input topic's language (Indonesian).`;

    const result = await callAIJson([
      {
        role: "system",
        content: "You are an expert Indonesian education assessment designer. Always return valid JSON only."
      },
      { role: "user", content: prompt }
    ], "Gagal menghasilkan soal lanjutan");

    res.json(result);
  } catch (error: any) {
    handleAIError(error, res, "Gagal menghasilkan soal lanjutan");
  }
});

// API: Grade Essay
app.post("/api/grade-essay", async (req, res) => {
  try {
    const { question, studentAnswer, context, answerKey } = req.body;
    
    const prompt = `You are a professional teacher grading an essay. 
    Question: "${question}"
    ${answerKey ? `Expected Answer / Grading Key: "${answerKey}"\n` : ""}
    Student Answer: "${studentAnswer}"
    ${context ? `Additional context: ${context}` : ""}
    
    Evaluate the response based on:
    1. Content Accuracy (40%)
    2. Structure and Clarity (30%)
    3. Relevance to the Question (30%)
    
    Provide a professional score (0-100) and constructive feedback for the student.
    Ensure the feedback is encouraging but precise.
    Return JSON only with this shape:
    {
      "score": 0,
      "feedback": "string",
      "analysis": {
        "contentScore": 0,
        "structureScore": 0,
        "relevanceScore": 0
      }
    }`;

    const result = await callAIJson([
      {
        role: "system",
        content: "You are a professional Indonesian teacher. Always return valid JSON only."
      },
      { role: "user", content: prompt }
    ], "Gagal menilai essay");
    res.json(result);
  } catch (error: any) {
    handleAIError(error, res, "Gagal menilai essay");
  }
});

// API: Refine Question based on analysis
app.post("/api/refine-question", async (req, res) => {
  try {
    const { question, analysis, distractorData } = req.body;
    
    const prompt = `As an educational expert, refine or fix the following question based on its performance metrics and distractor distribution.
    Original Question: ${JSON.stringify(question)}
    Performance Data: ${JSON.stringify(analysis)}
    ${distractorData ? `Distractor selection counts (how many students chose each wrong option): ${JSON.stringify(distractorData)}` : ""}
    
    The goal is to:
    1. Improve the Discrimination Index (Daya Beda) if it's low (< 0.3).
    2. Adjust the Difficulty Level (Tingkat Kesukaran) if it's too hard (< 0.2) or too easy (> 0.8).
    3. For multiple choice questions, identify "non-functional distractors" (options chosen by very few or no students) and replace them with more plausible but incorrect alternatives.
    4. Ensure the question is clear and pedagogically sound.

    Return the refined question and a clear set of "revisionNotes" explaining:
    - What was wrong (e.g., non-functional distractors, too easy, ambiguous wording).
    - What changes were made to fix it.

    Output languages should match the input question's language (Indonesian).
    Do not create image prompts, image URLs, diagrams, or visual aid metadata.
    Return JSON only with this shape:
    {
      "question": "string",
      "taxonomy": "C1|C2|C3|C4|C5|C6",
      "type": "Multiple Choice|Essay",
      "options": [{"label": "A", "text": "string", "isCorrect": true}],
      "explanation": "string",
      "revisionNotes": "string"
    }`;

    const result = await callAIJson([
      {
        role: "system",
        content: "You are an expert Indonesian assessment reviewer. Always return valid JSON only."
      },
      { role: "user", content: prompt }
    ], "Gagal memperbaiki soal");

    res.json(result);
  } catch (error: any) {
    handleAIError(error, res, "Gagal memperbaiki soal");
  }
});

// API: Midtrans Create Transaction
app.post("/api/create-transaction", async (req, res) => {
  try {
    const { userId, userEmail, userName } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
       return res.status(500).json({ error: "MIDTRANS_SERVER_KEY is not configured on the server." });
    }

    // Create Snap API instance
    let snap = new midtransClient.Snap({
        isProduction : false,
        serverKey : serverKey
    });

    let parameter = {
        "transaction_details": {
            "order_id": `EDUPRM-${userId}-${Date.now()}`,
            "gross_amount": 500000
        },
        "credit_card": {
            "secure" : true
        },
        "customer_details": {
            "first_name": userName || "Teacher",
            "email": userEmail || "teacher@edugrade.app",
        },
        "item_details": [{
            "id": "ITEM-PREMIUM-PRO",
            "price": 500000,
            "quantity": 1,
            "name": "Edugrade Premium Pro"
        }]
    };

    const transaction = await snap.createTransaction(parameter);
    res.json({ token: transaction.token, redirect_url: transaction.redirect_url });
  } catch (error: any) {
    console.error("Midtrans Transaction Error:", error);
    res.status(500).json({ error: error.message || "Gagal membuat transaksi" });
  }
});
// Helper function to call OCR Space API
async function performOcrSpace(base64Image: string): Promise<string> {
  const ocrSpaceKey = "K87944641388957";
  
  const formData = new URLSearchParams();
  formData.append("apikey", ocrSpaceKey);
  formData.append("base64Image", base64Image);
  formData.append("language", "eng");
  formData.append("scale", "true");
  formData.append("OCREngine", "1");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });

  if (!response.ok) {
    throw new Error(`OCR Space API returned status ${response.status}`);
  }

  const data = await response.json();
  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage?.[0] || "OCR Space processing error");
  }

  const parsedText = data.ParsedResults?.[0]?.ParsedText || "";
  return parsedText;
}

// API: Real OCR scan via hybrid OCR Space + AI
app.post("/api/ocr-scan", async (req, res) => {
  try {
    const { fileData, questions, isPdf } = req.body;
    
    if (!deepSeekApiKey) {
      return res.status(400).json({ error: "API Key belum diatur di file .env." });
    }

    if (!fileData) {
      return res.status(400).json({ error: "Tidak ada data file yang dikirim." });
    }

    // 1. Run real OCR via OCR Space API
    const rawOcrText = await performOcrSpace(fileData);

    // 2. Prepare questions metadata
    const questionsMeta = questions.map((q: any, idx: number) => ({
      index: idx,
      type: q.type,
      question: q.question,
      options: q.type === "Multiple Choice" ? q.options?.map((o: any) => o.label) : null
    }));

    const prompt = `Anda adalah asisten AI parser OCR untuk platform Edugrade.
Di bawah ini adalah teks mentah hasil scan LJK menggunakan OCR Space API:
---
${rawOcrText}
---

Daftar pertanyaan ujian yang ada di lembar jawaban tersebut:
${JSON.stringify(questionsMeta, null, 2)}

Tugas Anda:
Cocokkan teks hasil OCR di atas dengan daftar soal di atas untuk mengekstrak jawaban siswa.
Ketentuan:
1. Untuk Pilihan Ganda (Multiple Choice), temukan huruf pilihan jawaban siswa (misal: A, B, C, D, atau E) yang terpilih untuk nomor soal tersebut. Jika tidak diisi atau tidak jelas, kosongkan ("").
2. Untuk Esai (Essay), temukan transkripsi jawaban tertulis siswa untuk soal esai tersebut dan rapikan teksnya dalam Bahasa Indonesia yang baik.
3. Kembalikan HASIL dalam format JSON objek dengan key "answers" yang berisi pasangan index soal (string angka) dan jawaban siswa.

Contoh format respon JSON:
{
  "answers": {
    "0": "A",
    "1": "Sel prokariotik tidak memiliki membran inti..."
  }
}
Kembalikan JSON saja tanpa penjelasan apapun.`;

    // 3. Call OpenRouter using cheap text-only model to parse raw OCR text into JSON
    const ocrModel = isOpenRouterKey ? "google/gemini-2.5-flash" : "deepseek-chat";

    const response = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepSeekApiKey}`,
        ...(isOpenRouterKey ? {
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "Edugrade AI"
        } : {})
      },
      body: JSON.stringify({
        model: ocrModel,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error?.message || "Gagal mengolah teks OCR via AI.");
    }

    const rawContent = data?.choices?.[0]?.message?.content || "{}";
    const parsed = extractJson(rawContent);
    res.json(parsed);
  } catch (error: any) {
    console.error("Error OCR Scan Route:", error);
    res.status(500).json({ error: error.message || "Gagal memproses LJK OCR" });
  }
});

// Serve frontend
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  bootstrap();
}

export default app;
