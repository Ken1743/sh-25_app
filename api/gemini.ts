import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(204).end();

try {
    let prompt = 'Say hi in one sentence.';
    if (req.method === 'GET') {
    prompt = (req.query.prompt as string) ?? prompt;   // 例: /api/gemini?prompt=Hello
    } else if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    prompt = body?.prompt ?? prompt;
    } else {
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const r = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return res.status(200).json({ text: r.text ?? '' });
} catch (e: any) {
    console.error('[gemini]', e);
    return res.status(500).json({ error: String(e?.message ?? e) });
}
}
