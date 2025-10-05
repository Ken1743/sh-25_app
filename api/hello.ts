// my-app/api/hello.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
// --- ここがサーバー側のコンソール出力（Vercel Logsに出ます）---
const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
console.log(
    `[hello] ${new Date().toISOString()} ${req.method} ${req.url} ip=${ip}`
);

if (req.method === 'OPTIONS') {
    // （別オリジンから叩く可能性があるなら）簡易CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
}

res.setHeader('Access-Control-Allow-Origin', '*'); // 同一Originなら不要
return res.status(200).json({ ok: true, message: 'Hello from Vercel!' });
}


//test