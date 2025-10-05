# SenseBank — Local Dev Guide

This app generates a simple personality snapshot from lightweight choices and displays:

- A Profile Radar (Now vs Prev)
- MBTI-type image and highlights
- Markdown sections rendered from a prompt (Gemini optional)

Below are the fastest steps to run locally and to control the data for Now/Prev so you can verify visuals easily.

## ⭐️ Quick start

- Requirements

  - Node.js 20 (project is configured for Node 20.x)
  - npm (bundled with Node)

- Install dependencies

  ```bash
  npm install
  ```

- Start local dev (Vite + API server)
  ```bash
  npm run dev
  ```
  - Frontend: http://localhost:5173
  - API: http://localhost:8787
  - Vite proxies requests from the app to the local API.

You can run without any API key. If a Gemini key is present, the AI markdown becomes richer; without it, a friendly static summary is used.

## 🤖 Optional: Enable Gemini

Create a file named `.env.local` in the project root:

```env
# Either key works; prefer GEMINI_API_KEY2
GEMINI_API_KEY2=your_api_key_here
# or
# GEMINI_API_KEY=your_api_key_here
```

Then re-run `npm run dev`. The server will use the key when calling Gemini.

## 🧱 Build and preview

- Build
  ```bash
  npm run build
  ```
- Preview a production build locally
  ```bash
  npm run preview
  ```

## 📖 API reference (local)

- POST `http://localhost:8787/api/personality`
  - Body (optional): `{ "choices": { "sofa": 1, "kitchen": 2, ... } }`
  - Returns: `{ markdown, badges, now, history, mbtiType }`

## 📝 Notes for deployment (FYI)

- `vercel.json` is configured to bundle `big5-cal/**` and `src/utils/prompt.txt` for both `api/personality.ts` and `api/gemini.ts` so production matches local.
- The APIs accept `GEMINI_API_KEY2` or `GEMINI_API_KEY` from the environment.

---

Happy hacking! If you want a one-click reset of Prev in the UI or timestamped Prev labels, say the word and we’ll wire it in.
`npm i`

`git clone`

`npm run dev`
