# 🧠 SenseBank — Choice-Driven Personality Snapshot

💬 Powered by **Google Gemini** + **Unity WebGL**

## 💡 Inspiration

We love personality tests, but long text surveys aren’t friendly for busy people, kids, or anyone who prefers visual, low-reading experiences.  
So we asked: _what if everyday choices could be “banked” into a quick personality snapshot?_  
Morning chaos felt perfect—universal, playful, and time-boxed.

## 🚀 What It Does

SenseBank is a choice-driven mini-game about how you start your day.  
You wake up at **7:00 AM** and aim to leave by **10:00**.  
Each scene (breakfast, outfit, packing, distractions) shapes your **time, mood, and personality traits**.  
At the end, you’ll get a **friendly personality summary**, a **radar chart**, and **2–3 AI-generated tips**.

## 🛠️ How We Built It

- **Unity (C#)** for scenes and animations → exported to **WebGL**
- Embedded in **React + Vite** frontend
- Unity streams compact event logs (choice IDs, tags, deltas, timestamps) →
  **serverless API (Vercel)** → **Google Gemini** (schema-shaped reply, low temperature)
- **Fallback local scorer** for outages
- Lightweight UI (mono type, soft gradients, tuned routing/caching) for fast loads

## 🔥 Challenges We Faced

- Streaming structured Unity events to React in real time
- Making AI summaries feel **personal** but not **clinical**
- Optimizing WebGL + React performance for low-end devices

## 🏆 Accomplishments

- End-to-end AI summary that’s consistent yet human-sounding
- Schema-validated pipeline → clean, render-ready markdown
- A replayable, shareable UX people enjoyed
- Shipped Unity + Gemini integration on time

## 🎓 What We Learned

- First-time Unity: **scene flow**, **prefabs**, **state management**, full WebGL build
- **Schema-first prompting** > free text for reliability
- **Timeboxing** keeps scope realistic

## 🔮 What’s Next

- More scenes & smarter flow (AI-assisted dynamic branching)
- Accessibility: reduced-text mode, high-contrast theme, full keyboard nav, SR labels
- Embeddable widget for real journeys (opt-in, compliance-aware)
- Deeper analytics, exportable cards, small API for dashboards/A/B tests

## 🧩 Tech Stack

Unity · C# · React · TypeScript · Vite · Vercel · Google Gemini · CSS

## 🔗 Try It Out

- Live: https://my-app-kappa-steel.vercel.app
- Repo: https://github.com/fleur0121/sensebank
