import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

/** 生ボディを安全に読む（req.body が undefined の環境でも動く） */
function readJsonBody(req: VercelRequest): Promise<any> {
return new Promise((resolve) => {
    try {
    if (typeof req.body === 'string') {
        try { return resolve(JSON.parse(req.body)); } catch { return resolve({}); }
    }
    if (req.body && typeof req.body === 'object') return resolve(req.body);

    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    } catch {
    resolve({});
    }
});
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
// 常に JSON と CORS を返す
res.setHeader('Content-Type', 'application/json; charset=utf-8');
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') return res.status(204).end();

if (!process.env.GEMINI_API_KEY) {
    return res.status(500).end(JSON.stringify({ error: 'GEMINI_API_KEY is not set' }));
}

try {
    let prompt = await fetch("/prompt.txt").then(r => r.text());
    if (req.method === 'GET') {
    // GET でもテストできるように（例: /api/gemini?prompt=Hello）
    prompt = (req.query.prompt as string) ?? prompt;
    } else if (req.method === 'POST') {
    const body = await readJsonBody(req);
    prompt = (body?.prompt as string) ?? prompt;
    } else {
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    return res.status(405).end(JSON.stringify({ error: 'Method Not Allowed' }));
    }

    const r = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return res.status(200).end(JSON.stringify({ text: r.text ?? '' }));
} catch (e: any) {
    console.error('[gemini] error:', e);
    return res.status(500).end(JSON.stringify({ error: String(e?.message ?? e) }));
}
}


