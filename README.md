# TeamMind — Collaborative AI Brainstorming Workspace

**TeamMind** is a deployable shared browser workspace where team members can brainstorm together in real time, consult leading AI models via OpenRouter, challenge ideas through structured multi-model debates with automatic synthesis, and preserve project knowledge (ideas, votes, comments, action items, and reference documents).

---

## 🔐 Zero-Friction Name-Based Access

Access to TeamMind is provisioned specifically for the team:
- **Dana** (`dana`) — Team Member
- **Shivansh** (`shivansh`) — Workspace Owner
- **Lial** (`lial`) — Team Member
- **Niya** (`niya`) — Team Member

Any authorized member can enter the workspace by simply entering their name on the login screen or clicking their quick-select profile badge. All other names are strictly blocked.

---

## 🚀 Live Access & Deployment Options

### 1. Instant Local & LAN Access (Active Now)
The production Next.js build is currently running and live:
- **Local:** [http://localhost:3000](http://localhost:3000)
- **Local Network (Wi-Fi/LAN):** `http://10.220.64.45:3000`

Any team member on the same local network can open `http://10.220.64.45:3000`, enter their name (**Dana**, **Shivansh**, **Lial**, or **Niya**), and begin collaborating in real time!

### 2. Deploy to Vercel (Recommended for Public Web Access)
TeamMind has zero external setup requirements and deploys to Vercel in 1 click:
```bash
# In the project directory:
npx vercel
```
Or push this repository to GitHub and import it on [vercel.com](https://vercel.com).
- Optional: Add `OPENROUTER_API_KEY` in Vercel project environment variables for live OpenRouter API calls. (If omitted, TeamMind automatically uses intelligent mock responses so the entire app works seamlessly).

### 3. Instant Public URL via Tunnel
To generate an immediate public HTTPS URL accessible from anywhere on the internet:
```bash
npx localtunnel --port 3000
```

---

## 🧠 Core Features

1. **Shared Brainstorming Room:**
   - Real-time team messaging with member avatars and timestamps.
   - Distinct labels for human messages vs AI model responses.
   - Single-click action to convert any message to a **Project Idea** or **Action Item**.
2. **Consult OpenRouter AI:**
   - Model selector: Claude 3.5 Sonnet, GPT-4o, Gemini 2.0 Flash, Llama 3.3 70B, DeepSeek V3.
   - Context-aware dialogue history.
3. **Multi-Model Debate & Synthesis:**
   - **Opportunity Scan:** Uncovers latent solutions while distinguishing evidence from speculation.
   - **Red-Team Critique:** Systematic risk analysis, blind spots, and operational failure modes.
   - **Feasibility Review:** Architecture, technical complexity, and missing information.
   - **Synthesis Engine:** Identifies consensus, surfaces contradictions, notes uncertainties, and outputs prioritized next steps.
4. **Project Ideas Repository:**
   - Status pipeline (`proposed`, `under_review`, `accepted`, `rejected`, `implemented`).
   - One-vote-per-member mechanic with interactive upvote toggle and counters.
   - In-line team discussion comments.
5. **Action Items Board:**
   - Implementation task tracking (`open`, `in_progress`, `blocked`, `completed`).
   - Assignee tags and due dates.
6. **Secure Reference Documents:**
   - Private storage with clear privacy guarantees. Documents are never ingested into AI prompts without explicit opt-in.

---

## 🧪 Automated Test Suite

TeamMind includes **22 automated Vitest tests** covering name authentication, cross-workspace security, RLS boundaries, debate synthesis, and rate limiting:
```bash
npm test
```
All 22 tests pass with 100% green status.
