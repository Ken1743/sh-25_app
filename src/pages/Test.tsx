// src/test.tsx
import { useState } from "react";

export default function Test() {
const [prompt, setPrompt] = useState("");
const [answer, setAnswer] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const send = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setAnswer("(loading...)");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
  
      // ★ JSON以外や空レスポンスでも落ちないようにする
    const raw = await res.text();
    let data: any = {};
    if (raw) {
        try {
        data = JSON.parse(raw);
        } catch {
        throw new Error(`Invalid JSON from server: ${raw.slice(0, 120)}…`);
        }
    }

    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    setAnswer(data?.text ?? "(no text)");
    } catch (e: any) {
    setError(e?.message ?? String(e));
    setAnswer("");
    } finally {
    setLoading(false);
    }
};


const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    send();
    }
};

return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
    <h1>Gemini 言語生成テスト</h1>

    <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
        プロンプト
    </label>
    <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={onKeyDown}
        rows={6}
        placeholder="ここに質問や指示を書いてください（⌘/Ctrl + Enter で送信）"
        style={{ width: "100%", padding: 12, fontSize: 16 }}
    />

    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={send} disabled={loading || !prompt.trim()}>
        {loading ? "送信中..." : "送信"}
        </button>
        <button onClick={() => { setPrompt(""); setAnswer(""); setError(null); }} disabled={loading}>
        クリア
        </button>
    </div>

    {error && <p style={{ color: "crimson", marginTop: 12 }}>エラー: {error}</p>}

    <h2 style={{ marginTop: 24, marginBottom: 6 }}>応答</h2>
    <pre style={{color: "black", whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
        {answer || "(なし)"}
    </pre>

    <p style={{ color: "#666", marginTop: 8, fontSize: 12 }}>
        サーバー: <code>/api/gemini</code> に POST しています
    </p>
    </main>
);
}
//