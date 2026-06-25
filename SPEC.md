# LUCY Platform — Specification Document
## Language Unity & Collaborative Youth

---

## 1. Concept & Vision

**LUCY** is a gamified real-time social audio platform for Gen Z language learners (English, Chinese, Japanese), combining the intimacy of anonymous voice chat with structured EdTech progression. It feels like stepping into a neon-lit Tokyo arcade crossed with a language café — high-energy, pressure-free, and deeply rewarding. The platform rewards participation through leaderboards, virtual gifts, and visible skill progression — turning language practice from a chore into a game.

**Emotional Core:** Safe anonymity that breaks social anxiety. Structured rooms that feel like guided journeys. Real-time audio that feels as natural as speaking to a friend.

---

## 2. Design Language

### Color Palette
| Role | Name | Hex |
|---|---|---|
| Background | Deep Void | `#0B0B1A` |
| Surface | Dark Navy | `#12122A` |
| Card | Midnight | `#1A1A35` |
| Primary | Neon Cyan | `#00F5FF` |
| Secondary | Electric Violet | `#7B2FFF` |
| Accent/CTA | Hot Magenta | `#FF2D6B` |
| Success | Pulse Green | `#00FF9F` |
| Warning | Amber Glow | `#FFB800` |
| Text Primary | Ice White | `#F0F4FF` |
| Text Secondary | Mist | `#8892B0` |
| Border | Ghost | `#2A2A4A` |

### Typography
- **Headings:** `Orbitron` (Google Fonts) — futuristic, geometric, all-caps for hero text
- **UI Labels / Navigation:** `Exo 2` — clean, readable, slightly technical
- **Body / Chat:** `Inter` — highly legible for conversational text
- **Monospace / Code:** `JetBrains Mono` — for IDs, tokens, technical displays
- **Fallbacks:** `system-ui, -apple-system, sans-serif`

### Spatial System
- Base unit: `4px`
- Spacing scale: `4, 8, 12, 16, 24, 32, 48, 64, 96`
- Border radius: `4px` (small), `8px` (medium), `16px` (large), `24px` (pill)
- Card shadows: `0 0 20px rgba(0, 245, 255, 0.08)` with subtle glow on hover

### Motion Philosophy
- **Page transitions:** Fade + slide-up, `300ms cubic-bezier(0.4, 0, 0.2, 1)`
- **Micro-interactions:** Scale `1.0 → 1.05` on hover, `200ms ease-out`
- **Live indicators:** Pulsing dot animation, breathing glow effects
- **Audio level:** Real-time waveform bars responding to mic input
- **Loading:** Skeleton shimmer with cyan gradient sweep
- **Stagger:** List items enter with 80ms delay between each

### Visual Assets
- **Icons:** Lucide React (consistent 2px stroke)
- **Avatars:** Procedurally generated gradient avatars (no real photos)
- **Backgrounds:** CSS mesh gradients + subtle grid overlay pattern
- **Decorative:** Animated star/particle field on hero sections

---

## 3. Architecture

### Microservices (3 Backend Services + 1 Frontend)

```
┌──────────────────────────────────────────────────────┐
│                    React Frontend                     │
│           (Vite + TypeScript + TailwindCSS)          │
└────────────────────┬─────────────────────────────────┘
                     │ HTTPS / REST + WebSocket
          ┌──────────┴──────────┬─────────────────────┐
          │                     │                     │
   ┌──────▼──────┐      ┌───────▼───────┐   ┌───────▼───────┐
   │  .NET Core  │      │   Node.js      │   │   Agora SDK   │
   │  Identity   │      │   Real-time    │   │   (External)  │
   │  & Payment  │      │   & LMS        │   │               │
   │  Service    │      │   Service      │   │               │
   └─────────────┘      └───────────────┘   └───────────────┘
```

### Service Breakdown
- **NET Service (Port 5001):** User identity, JWT auth, role management (LUCY/Pro/Super), wallet, gift transactions, Swagger API
- **Node.js Service (Port 3001):** Socket.io real-time rooms, Agora token generation, level/content management, stage progression, podcast recording metadata
- **React Frontend (Port 5173):** SPA with role-based views, real-time audio UI, LMS dashboard, leaderboard

### API Contracts
| Method | Endpoint | Service | Description |
|---|---|---|---|
| POST | `/api/auth/register` | .NET | Register new user |
| POST | `/api/auth/login` | .NET | Login → JWT |
| GET | `/api/users/me` | .NET | Current user profile |
| POST | `/api/wallet/deposit` | .NET | Add funds to wallet |
| POST | `/api/gifts/send` | .NET | Send gift to room |
| GET | `/api/levels` | Node.js | Get all 100 levels |
| GET | `/api/levels/:id/content` | Node.js | Get level content |
| GET | `/api/rooms` | Node.js | List active rooms |
| POST | `/api/rooms` | Node.js | Create room (Pro/Super) |
| GET | `/api/agora/token` | Node.js | Generate Agora RTC token |
| WS | `/ws/room/:id` | Node.js | Socket.io room events |

---

## 4. User Roles & Permissions

| Feature | LUCY (Anonymous) | LUCY Pro | LUCY Super |
|---|---|---|---|
| Join rooms by Level | ✅ | ✅ | ✅ |
| Speak (hand-raise queue) | ✅ | ✅ | ✅ |
| Use avatar persona | ✅ | ✅ | ✅ |
| Create rooms | ❌ | ✅ | ✅ |
| Pin LMS content | ❌ | ✅ | ✅ |
| Record to Podcast | ❌ | ❌ | ✅ |
| Earn gifts | ❌ | ✅ | ✅ |
| View analytics dashboard | ❌ | ✅ | ✅ |
| Premium content access | ❌ | ❌ | ✅ |

---

## 5. Features & Interactions

### Authentication & Onboarding
- **Register:** Email, password, display name, chosen avatar persona (5 preset gradients)
- **Login:** Email + password → JWT (24h expiry), refresh token (7d)
- **Role upgrade:** LUCY can request Pro/Super verification (stubbed in MVP)

### Room System
- **Join flow:** Select language → Choose level (1-100) → Browse rooms → Enter
- **Hand raise:** Click → appear in Moderator's queue → accepted → mic unlocks
- **Room states:** `Lobby → Active → SubLevel Transition → Active → ... → Closed`
- **Stage progression:** Every 10 minutes, next sub-level activates automatically
- **Real-time events:** User join/leave, hand-raise, gift sent, stage change, room close

### LMS & Content
- **Level structure:** 100 levels across 3 stages (Beginner/Intermediate/Advanced)
- **Content per level:** Vocabulary list, conversation prompts, grammar tips
- **Pin mechanism:** Pro/Super can pin 1 document per room
- **AI suggestions:** Mocked suggestion panel showing "AI recommends..." prompts

### Wallet & Gifts
- **Balance display:** Top-right corner of room, animated coin counter
- **Gift catalog:** 6 preset gifts ($1-$50 virtual currency)
- **Gift animation:** Gift icon flies from sender to recipient with particle burst
- **Leaderboard:** Weekly ranking by gift value received

### Podcast (Super only)
- **Recording:** Start/stop button in room controls
- **Library:** Grid of recorded sessions with duration, date, listen count
- **Playback:** Inline audio player with waveform visualization

---

## 6. Component Inventory

### Core Components
| Component | States |
|---|---|
| `Button` | default, hover (glow), active (press), disabled (opacity 0.5), loading (spinner) |
| `Input` | default, focus (cyan border glow), error (magenta border), disabled |
| `Card` | default, hover (lift + shadow), active |
| `Avatar` | gradient-based procedural avatar with persona badge |
| `Badge` | role badges: LUCY (cyan), Pro (violet), Super (magenta) |
| `Modal` | slide-up from bottom, backdrop blur |
| `Toast` | success (green), error (magenta), info (cyan) — auto-dismiss 3s |
| `Skeleton` | shimmer animation matching component shape |
| `LiveIndicator` | pulsing red dot for active broadcasts |

### Feature Components
| Component | Description |
|---|---|
| `RoomCard` | Room preview with language flag, participant count, level badge, live dot |
| `HandRaiseQueue` | Ordered list of waiting users for Moderator |
| `AudioVisualizer` | Real-time mic level bars (8 bars, animated) |
| `LevelProgress` | Circular progress ring showing sub-level completion |
| `GiftRain` | Animated gift flying across screen |
| `LeaderboardRow` | Rank, avatar, name, gift score, trend arrow |
| `PodcastCard` | Thumbnail, title, duration, play button |
| `LMSContentPin` | Pinned document card with download/view |
| `AgoraRoomView` | Full room UI with participants grid, hand-raise, mic controls |

---

## 7. Technical Approach

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** TailwindCSS with custom config (LUCY design tokens)
- **State:** Zustand (lightweight, TypeScript-friendly)
- **Routing:** React Router v6
- **Real-time:** Socket.io-client
- **API Calls:** Axios with interceptors (JWT attach)
- **Icons:** Lucide React
- **Notifications:** React Hot Toast
- **Animations:** Framer Motion

### Node.js Service
- **Runtime:** Node.js 22 + TypeScript
- **Framework:** Express.js
- **Real-time:** Socket.io
- **Audio:** Agora Access Token (HMAC-SHA1), RTC client stubbed
- **Database:** SQLite (via better-sqlite3) for rapid MVP
- **ORM:** Drizzle ORM
- **Auth:** JWT middleware, anonymous token generation
- **Validation:** Zod
- **CORS:** Configured for localhost:5173

### .NET Service
- **Framework:** ASP.NET Core 10
- **Auth:** JWT Bearer tokens, Identity stub
- **Database:** SQLite (EF Core InMemory for rapid MVP)
- **API Docs:** Swashbuckle Swagger
- **Wallet:** In-memory decimal tracking
- **Validation:** Data Annotations

---

## 8. Data Models

### .NET (Identity & Payment)
```
User { Id, Email, PasswordHash, DisplayName, PersonaId, Role (enum), WalletBalance, CreatedAt }
GiftTransaction { Id, SenderId, RecipientId, RoomId, GiftType, Amount, CreatedAt }
WalletLedger { Id, UserId, Amount, Type (Deposit/Gift/Spent), CreatedAt }
```

### Node.js (Real-time & LMS)
```
Level { Id, Name, Language (EN/ZH/JA), Stage, SubLevel, ContentJson }
Room { Id, Name, HostId, Language, LevelId, IsLive, CreatedAt }
RoomParticipant { RoomId, UserId, JoinedAt, IsMuted, HandRaised }
Podcast { Id, RoomId, CreatorId, Title, DurationSec, FileUrl, CreatedAt }
ContentPin { Id, RoomId, LevelId, DocumentTitle, DocumentUrl }
```

---

## 9. Project Structure

```
Project_SWD392_LUCY/
├── SPEC.md
├── README.md
├── packages/
│   ├── frontend/          # React + Vite + TypeScript
│   ├── net-service/      # .NET Core Identity & Payment API
│   └── njs-service/       # Node.js Real-time & LMS API
```

---

## 10. Week-by-Week Implementation (Action Plan)

| Week | Focus | Deliverable |
|---|---|---|
| 1-2 | Infrastructure & Auth | .NET Auth + JWT; React Login/Register; SQLite setup |
| 3-5 | Real-time MVP | Node.js Socket.io rooms; Agora token stub; React room UI |
| 6-7 | LMS & Design Patterns | Level content API; Stage auto-transition (Observer Pattern); Content pin |
| 8-9 | Monetization | .NET Wallet & Gifts; Gift animation; Leaderboard |
| 10 | Polish & Stress Test | Cross-testing; Bug fixes; Beta release prep |
