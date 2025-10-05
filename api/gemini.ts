// my-app/api/gemini.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
// Vercel の環境変数（後で設定）
apiKey: process.env.GEMINI_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
// 簡易CORS（同一オリジンだけなら不要）
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') return res.status(204).end();
if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
}

if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
}

try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const prompt: string = body?.prompt ?? 'Say hi in one sentence.';

    // まずは軽量モデルでテスト（用途に応じて pro 系に変更OK）
    const r = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    // SDK の text ヘルパー（空文字の可能性もあるので ?? で保険）
    return res.status(200).json({ text: r.text ?? '' });
} catch (e: any) {
    console.error('[gemini] error:', e);
    return res.status(500).json({ error: String(e?.message ?? e) });
}
}
