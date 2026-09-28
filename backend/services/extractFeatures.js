import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// IMPORTANT: the Groq SDK throws synchronously if apiKey is missing/empty.
// Instantiating it at module load time would crash the whole server on boot
// whenever GROQ_API_KEY isn't set yet (e.g. before it's been added in
// Railway's Variables tab). Create it lazily on first real use instead, so
// the server always starts — only a request that actually needs Groq fails,
// with a clear error, until the key is set.
let groq = null;

function getGroqClient() {
  if (groq) return groq;

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set — cannot reach Groq for this request.");
  }

  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

const SYSTEM_PROMPT = `You extract structured features from a workplace task description for a routing engine.
Return ONLY a raw JSON object, no prose, no markdown fences, with these exact keys, each a float between 0.0 and 1.0:
- c: AI capability for this task type (how well a competent AI model could do this)
- k: judgment/decision weight required (creativity, ambiguity, negotiation, empathy)
- e: human expertise/domain-knowledge required, relative to a typical employee
- s: data sensitivity (PII, financial, health, legal, client-confidential)
- r: risk/irreversibility of the action (0 = fully reversible/low stakes, 1 = irreversible/high stakes e.g. payments, deletions, public communication, contract signature)
- t: time cost (how long the task takes a human, normalized against typical task time)

Also return "tags": an array of short lowercase snake_case tags describing the task type and any
special categories that apply, drawn from context. Include a regulated-decision tag if relevant
(one of: hiring, firing, promotion, pay, credit, health, legal), and a banned-input tag if the task
asks for emotion recognition, biometrics, personality scoring, or inferring personal traits
(one of: emotion_recognition, biometrics, personality_scoring, inferred_traits) — only include these
if the task genuinely calls for them, do not add them speculatively.

Example output:
{"c":0.55,"k":0.70,"e":0.80,"s":0.50,"r":0.60,"t":0.40,"tags":["customer_complaint","billing"]}`;

/**
 * @param {string} title
 * @param {string} description
 * @returns {Promise<{c:number,k:number,e:number,s:number,r:number,t:number,tags:string[]}>}
 */
export async function extractTaskFeatures(title, description) {
  const client = getGroqClient();

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Task title: ${title || "(untitled)"}\nTask description: ${description}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Groq returned no content for feature extraction.");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Groq returned invalid JSON: ${raw}`);
  }

  return {
    c: parsed.c,
    k: parsed.k,
    e: parsed.e,
    s: parsed.s,
    r: parsed.r,
    t: parsed.t,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  };
}

/**
 * Executes a task fully via AI (route = 'ai'), or writes a draft for a
 * human to review (route = 'hybrid'). Kept separate from extraction so the
 * two Groq calls can use different prompting strategies.
 */
export async function generateAiOutput(title, description, mode /* 'execute' | 'draft' */) {
  const client = getGroqClient();

  const instruction =
    mode === "draft"
      ? "Write a DRAFT response/output for this task. Make clear it is a draft awaiting human review — do not take any irreversible action, just produce the text/content a human will review and approve."
      : "Complete this task fully and directly. Produce the final output.";

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: instruction },
      {
        role: "user",
        content: `Task title: ${title || "(untitled)"}\nTask description: ${description}`,
      },
    ],
    temperature: 0.4,
  });

  return response.choices?.[0]?.message?.content || "";
}
