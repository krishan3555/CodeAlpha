require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// ===== AI PROVIDERS =====
const OpenAI = require("openai");
const Groq = require("groq-sdk");
const fetch = require("node-fetch"); // for Ollama HTTP calls

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(__dirname));

// ✅ Pick provider from .env (OPENAI / GROQ / OLLAMA)
const PROVIDER = process.env.AI_PROVIDER || "OPENAI";

// --- OpenAI client ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Groq client ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


// --- Ollama: runs locally at http://localhost:11434 ---
async function callOllama(message) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3", // change to mistral/gemma/etc if installed
      prompt: message
    })
  });
  const data = await res.json();
  return data.response || "⚠️ No response from Ollama";
}

// ===== Chat Endpoint =====
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    let reply = "";

    if (PROVIDER === "OPENAI") {
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: message }
        ]
      });
      reply = response.output_text || "⚠️ No response from OpenAI";
    }

    else if (PROVIDER === "GROQ") {
      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant", // updated to current free Groq model
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: message }
        ]
      });
      reply = response.choices[0]?.message?.content || "⚠️ No response from Groq";
    }

    else if (PROVIDER === "OLLAMA") {
      reply = await callOllama(message);
    }

    res.json({ reply });

  } catch (err) {
    console.error("❌ Error in /chat:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Serve the main HTML file at the root path
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(3000, () => {
  console.log(`✅ Server running on http://localhost:3000 using ${PROVIDER}`);
});
