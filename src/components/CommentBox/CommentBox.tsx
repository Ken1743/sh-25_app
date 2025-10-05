import { useEffect, useRef } from "react";
import "./CommentBox.css";

/** ---- CustomEvent payload types ---- */
type CommentsGenerateDetail = { jsonText: string };
type CommentsPostedDetail = { name: string; text: string };
type CommentsReadyDetail = { text: string };

/**
 * 表示用の“場所だけ”コンポーネント（ロジックは裏JSで）
 * - JSON入力 (#jsonInput)
 * - 結果表示 (#resultView) … 裏から "comments:ready" で反映
 * - コメント投稿（#nameInput, #commentInput, #commentList）
 *
 * 送受信するイベント:
 *   - dispatch: "comments:generate"  detail: { jsonText }
 *   - dispatch: "comments:posted"    detail: { name, text }
 *   - listen : "comments:ready"      detail: { text }  → 結果欄に反映
 */
export default function CommentsPage() {
  // refs（型安全にDOMへアクセス）
  const jsonInputRef = useRef<HTMLTextAreaElement | null>(null);
  const resultRef = useRef<HTMLPreElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const commentRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // "comments:ready" を受けて結果を描画
  useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<CommentsReadyDetail>;
      if (resultRef.current) {
        resultRef.current.textContent = ce.detail?.text ?? "";
      }
    };
    document.addEventListener("comments:ready", handler as EventListener);
    return () => {
      document.removeEventListener("comments:ready", handler as EventListener);
    };
  }, []);

  const onClickGenerate = () => {
    const jsonText = jsonInputRef.current?.value ?? "";
    document.dispatchEvent(
      new CustomEvent<CommentsGenerateDetail>("comments:generate", {
        detail: { jsonText },
      })
    );
  };

  const onClickPost = () => {
    const name = (nameRef.current?.value || "Anonymous").trim();
    const text = (commentRef.current?.value || "").trim();
    if (!text) return;

    // 画面へ即時反映（必要なら後でAPI保存に差し替え）
    if (listRef.current) {
      const li = document.createElement("li");
      li.className = "comment-item";
      li.innerHTML = `
        <div class="comment-meta">
          <span class="comment-name"></span>
          <span class="dot">•</span>
          <time>${new Date().toLocaleString()}</time>
        </div>
        <p class="comment-text"></p>
      `;
      (li.querySelector(".comment-name") as HTMLElement).textContent = name;
      (li.querySelector(".comment-text") as HTMLElement).textContent = text;
      listRef.current.prepend(li);
    }

    // 裏ロジックへ通知
    document.dispatchEvent(
      new CustomEvent<CommentsPostedDetail>("comments:posted", {
        detail: { name, text },
      })
    );

    if (commentRef.current) commentRef.current.value = "";
  };

  return (
    <div className="comments-container">
      <header className="comments-header">
        <h1>Comments & Personality Result</h1>
        <p className="subtitle">
          UI only. Your background JS handles data & Gemini calls.
        </p>
      </header>

      <section className="card">
        <h2 className="card-title">1) User Choices (JSON)</h2>
        <textarea
          ref={jsonInputRef}
          className="textarea"
          rows={6}
          spellCheck={false}
          placeholder='{"sofa":"2","kitchen":4,"wakeUp":"1","computer":2}'
          defaultValue={`{
  "sofa": "2",
  "kitchen": 4,
  "wakeUp": "1",
  "computer": 2
}`}
        />
        <div className="actions">
          <button className="btn primary" onClick={onClickGenerate}>
            Generate (background)
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">2) Result</h2>
        <pre ref={resultRef} className="result" aria-live="polite" />
      </section>

      <section className="card">
        <h2 className="card-title">3) Comments</h2>

        <div className="comment-form">
          <div className="row">
            <label htmlFor="nameInput" className="label">
              Name (optional)
            </label>
            <input
              id="nameInput"
              ref={nameRef}
              className="input"
              placeholder="Your name"
              maxLength={40}
            />
          </div>

          <div className="row">
            <label htmlFor="commentInput" className="label">
              Comment
            </label>
            <textarea
              id="commentInput"
              ref={commentRef}
              className="textarea"
              rows={3}
              placeholder="Your comment…"
              maxLength={500}
            />
            <div className="comment-actions">
              <button className="btn" onClick={onClickPost}>
                Post
              </button>
            </div>
          </div>
        </div>

        <ul ref={listRef} className="comment-list">{/* prependされる */}</ul>
      </section>
    </div>
  );
}
