import { config } from '../config/env.js';
import { AppError } from '../utils/asyncHandler.js';

const SYSTEM_PROMPT = `You are the Atyant Assistant — a friendly, focused chatbot on the Atyant Launchpad website.

Atyant is a decision-clarity service that helps Indian students (after 12th and during college) choose the right college, branch, and career path. We are NOT a mentorship platform in the traditional sense — we focus on giving practical, parent-friendly guidance and connecting students to real seniors from their target colleges.

Your job:
1. Help students figure out what guidance they need (better college choice, better branch choice, 1:1 session, or just info).
2. Ask short, useful questions — stream (PCM/PCB/Commerce), rank or marks, what's confusing them.
3. Give crisp, helpful suggestions. Never invent specific cutoffs, exact ranks, or college rankings — say "we can check this with a senior" instead.
4. If the student seems ready, gently nudge them to share their name + email so the team can follow up, or to check pricing.
5. Be warm and direct. No fluff. Short replies (2–4 sentences usually).

Pricing the user might ask about:
- Better College: ₹149
- Better Branch: ₹149
- Combo Pack: ₹249 (most popular)
- 1:1 Personal Guidance: ₹999 (60-min consultation)

If asked for medical/legal/financial advice outside career guidance, politely redirect to a professional.
Reply in clear, simple English only.`;

const MAX_HISTORY = 20; // last 20 messages we send to the model

export async function generateReply({ session, userMessage }) {
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey || groqKey.startsWith('sk-ant-xx')) {
    // Graceful fallback so dev works without a real API key
    return {
      content: `Thanks — we got: "${userMessage}". Our team will follow up by email with personalised advice.`,
      stub: true,
    };
  }

  // Build the messages array from session history + current user msg.
  // The OpenAI/Groq API expects alternating user/assistant roles.
  const history = session.messages.slice(-MAX_HISTORY).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const messages = [...history, { role: 'user', content: userMessage }];

  let res;
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });
  } catch (err) {
    throw new AppError(`Groq API request failed: ${err.message}`, 502);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AppError(`Groq API error ${res.status}: ${text.slice(0, 200)}`, 502);
  }

  const data = await res.json();

  // Groq returns OpenAI-format: data.choices[0].message.content
  const text = data?.choices?.[0]?.message?.content?.trim() || '';

  if (!text) throw new AppError('Groq API returned empty content', 502);

  return { content: text, stub: false, usage: data.usage };
}
