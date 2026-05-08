# Notification Systems Research

> Research into open-source React notification libraries compatible with SIA's tech stack:
> **React 19 + Vite + TypeScript + Tailwind CSS + Radix UI + Zustand + TanStack Query + Hono (backend)**

**Note:** SIA already uses **Sonner 2.0.7** for toast notifications.

---

## Table of Contents

1. [Summary Comparison](#summary-comparison)
2. [Toast / Snackbar Libraries](#category-1-toast--snackbar-libraries)
3. [Notification Center / Inbox](#category-2-notification-center--inbox)
4. [Real-time Infrastructure](#category-3-real-time-infrastructure)
5. [Recommendations](#recommendations)

---

## Summary Comparison

| Library | Category | GitHub Stars | Bundle Size | Tailwind/Radix Fit | Self-Hostable | Cost |
|---|---|---|---|---|---|---|
| **Sonner** | Toast | ~12K | 13.9 kB | Native (shadcn) | N/A | Free (MIT) |
| **React Hot Toast** | Toast | ~10.8K | 5 kB | Manual styling | N/A | Free (MIT) |
| **React-Toastify** | Toast | ~13.5K | 12.7 kB | Requires CSS override | N/A | Free (MIT) |
| **Notistack** | Toast | ~4K | — | MUI-focused | N/A | Free (MIT) |
| **Novu** | Inbox + Infra | ~39K | — | Compatible | Yes | Free (open core) |
| **Knock** | Inbox + Infra | — | — | Compatible | No | From $250/mo |
| **MagicBell** | Inbox + Infra | — | — | Compatible | No | Managed SaaS |
| **Engagespot** | Inbox + Infra | — | — | Compatible | No | From $49/mo |

---

## Category 1: Toast / Snackbar Libraries

Lightweight, client-side libraries for temporary popup notifications. No persistence, no inbox.

### 1.1 Sonner (Already Installed)

- **GitHub:** https://github.com/emilkowalski/sonner
- **Stars:** ~12,000 | **Bundle:** ~13.9 kB gzipped | **License:** MIT
- **Install:** `npm install sonner`

**Key Features:**
- TypeScript-first, zero dependencies
- Promise-based API for async operations
- Built-in dark mode support
- Customizable icons and undo actions
- Official shadcn/ui toast component

**Pros:**
- First-class shadcn/ui integration — `npx shadcn@latest add sonner`
- Modern, beautiful default styling that works with Tailwind
- Minimal API surface, trigger toasts from anywhere without hooks
- Used by OpenAI, Sonos, Adobe

**Cons:**
- Opinionated design (less customization than react-toastify)
- Newer library, smaller plugin ecosystem

**SIA Status:** Already installed (`sonner@2.0.7`). Best fit for our stack.

---

### 1.2 React Hot Toast

- **GitHub:** https://github.com/timolins/react-hot-toast
- **Stars:** ~10,800 | **Bundle:** ~5 kB gzipped | **License:** MIT
- **Install:** `npm install react-hot-toast`

**Key Features:**
- Smallest bundle size of any popular toast library
- Promise-based API
- Pause on hover
- **Headless mode** for fully custom UI
- Works in React Native (headless)

**Pros:**
- Extremely lightweight (~5 kB)
- Clean, minimal API
- Headless mode allows full UI control with Tailwind

**Cons:**
- Fewer built-in features than react-toastify
- Less active maintenance recently
- No native Tailwind/shadcn integration

**SIA Fit:** Good alternative if bundle size is critical. Headless mode pairs well with Tailwind.

---

### 1.3 React-Toastify

- **GitHub:** https://github.com/fkhadra/react-toastify
- **Stars:** ~13,500+ | **Bundle:** ~12.7 kB gzipped | **License:** MIT
- **Install:** `npm install react-toastify`

**Key Features:**
- RTL support (relevant for Arabic in KSA market)
- 6 built-in animation types
- Drag to close, swipe support
- onOpen/onClose hooks
- Can render React components inside toasts

**Pros:**
- Most feature-rich toast library
- Largest community and ecosystem
- RTL support out of the box

**Cons:**
- Requires importing a CSS file (less ideal for Tailwind-only setups)
- Default styling may clash with Tailwind/Radix design system
- Larger bundle than Sonner

**SIA Fit:** Worth considering for RTL/Arabic support. Otherwise, Sonner is a better fit.

---

### 1.4 Notistack

- **GitHub:** https://github.com/iamhosseindhv/notistack
- **Stars:** ~4,000+ | **License:** MIT
- **Install:** `npm install notistack`

**Key Features:**
- Stackable snackbars with queue system
- `useSnackbar` hook
- Smooth transitions

**Pros:**
- Good stacking/queuing behavior

**Cons:**
- Historically coupled to Material UI
- Smaller community
- Not natural with Tailwind/Radix

**SIA Fit:** Not recommended. MUI-focused, poor fit for our Tailwind/Radix stack.

---

## Category 2: Notification Center / Inbox

Full notification systems with persistent feeds, read/unread states, bell icons, user preferences, and multi-channel delivery.

### 2.1 Novu (Open Source)

- **GitHub:** https://github.com/novuhq/novu
- **Stars:** ~39,000 | **License:** MIT (core) + commercial (enterprise)
- **Install:** `npm install @novu/react`

**Key Features:**
- Embeddable `<Inbox />` React component (6 lines of code)
- Real-time updates via WebSocket (Socket.io)
- Multi-channel: in-app, email, SMS, push, Slack, chat
- Workflow automation and digest engine
- User notification preferences management
- Full API and headless SDK available

**Backend Requirements:** Node.js/TypeScript, NestJS, MongoDB, Redis + BullMQ, Socket.io

**Pros:**
- Most popular open-source notification infrastructure (~39K stars)
- Self-hostable — avoids vendor lock-in
- Full-featured: workflows, templates, analytics, digest
- Active development, large community
- Free tier on cloud offering
- React + TypeScript + Tailwind compatible

**Cons:**
- Heavy infrastructure for self-hosting (MongoDB, Redis, etc.)
- "Open core" model — some enterprise features behind commercial license
- Complexity overhead if you only need simple in-app notifications

**SIA Fit:** Best open-source option for a full notification center. Ideal for deal updates, document signing requests, and multi-channel delivery. Self-hosting adds infrastructure burden but aligns with SIA's control requirements.

**Integration Example:**
```tsx
import { Inbox } from '@novu/react';

function NotificationCenter() {
  return (
    <Inbox
      applicationIdentifier="YOUR_APP_ID"
      subscriberId="USER_ID"
    />
  );
}
```

---

### 2.2 Knock

- **GitHub:** https://github.com/knocklabs/react-notification-feed (React SDK only)
- **Install:** `npm install @knocklabs/react`
- **Type:** Managed SaaS (React components are open source)

**Key Features:**
- Pre-built components: `NotificationFeedPopover`, `NotificationFeed`, `NotificationIconButton`
- Headless mode with React hooks for custom UI
- Bell icon with unread/unseen count
- Real-time updates
- Multi-channel workflows

**Pros:**
- Polished, production-ready React components
- Headless SDK for full UI customization
- Well-documented, Vercel partnership

**Cons:**
- Not open source (managed service)
- Starts at **$250/month**
- Vendor lock-in

**SIA Fit:** Best managed option if budget allows. React components are open source and customizable.

---

### 2.3 MagicBell

- **GitHub:** https://github.com/magicbell/magicbell-js
- **Install:** `npm install @magicbell/magicbell-react`
- **Type:** Managed SaaS with open source React SDK

**Key Features:**
- `FloatingInbox` component for navbar integration
- Bell icon with unseen notification count
- Read/unread state management
- Pagination and real-time updates
- React Native support

**Pros:**
- Y Combinator backed
- Clean React component API
- Headless SDK available

**Cons:**
- Not fully open source (managed service)
- Vendor lock-in
- Less community traction than Novu or Knock

**SIA Fit:** Solid managed alternative but less popular than Knock or Novu.

---

### 2.4 Engagespot

- **Website:** https://www.engagespot.co
- **Type:** Managed SaaS

**Key Features:**
- In-app notification center component
- Multi-channel: in-app, email, SMS, WhatsApp, Slack
- User preference management
- React, Vue, and vanilla JS SDKs

**Pricing:** Free tier, then from $49/month

**Pros:**
- More affordable than Knock ($49 vs $250/month)
- Good documentation

**Cons:**
- Not open source
- Smaller community, less mature

**SIA Fit:** Budget-friendly managed option if avoiding self-hosting.

---

## Category 3: Real-time Infrastructure

Lower-level tools for pushing real-time data to clients. Use these to build custom notification delivery.

### 3.1 Socket.io

- **GitHub:** https://github.com/socketio/socket.io
- **Stars:** ~62,000+ | **License:** MIT

**Key Features:**
- Bidirectional event-based communication (WebSocket)
- Automatic reconnection
- Room/namespace support
- Fallback to HTTP long-polling

**Relevance:** Not a notification library itself, but the most common transport layer for building custom real-time notification systems. Novu uses Socket.io internally. Could be used directly with SIA's Hono backend.

### 3.2 Server-Sent Events (SSE)

- Native browser API, no library needed
- One-way server-to-client communication
- Simpler than WebSocket for notification push
- Works well with Hono backend

**Relevance:** Lightest-weight option for pushing notifications from Hono to the React frontend. No library dependency.

---

## Recommendations

### Current State
SIA already uses **Sonner** for toast notifications. No changes needed for toast/snackbar functionality.

### For a Full Notification System

**Recommended approach — Combined Architecture:**

| Layer | Tool | Purpose |
|---|---|---|
| **Toast/Transient** | Sonner (already installed) | Form feedback, errors, success messages |
| **Notification Inbox** | Novu (open source) | Persistent notifications, read/unread, bell icon |
| **Real-time Transport** | Socket.io or SSE | Push notifications from Hono backend |
| **Multi-channel** | Novu workflows | Email, SMS, push for deal updates, signing requests |

### Why Novu for SIA?

1. **Open source + self-hostable** — control over data (important for B2B deal facilitation)
2. **Multi-channel** — deal updates via in-app + email + SMS
3. **Workflow engine** — automate notification flows (e.g., "signing request sent → reminder after 24h → escalation")
4. **React `<Inbox />` component** — drop-in UI compatible with Tailwind
5. **Headless SDK** — full control to match SIA's design system
6. **Active community** — ~39K GitHub stars, well-maintained

### If Self-Hosting is Too Heavy

Use **Novu Cloud** (free tier) or **Engagespot** ($49/mo) to avoid managing MongoDB + Redis infrastructure.

---

## Sources

- [Sonner GitHub](https://github.com/emilkowalski/sonner)
- [React Hot Toast GitHub](https://github.com/timolins/react-hot-toast)
- [React-Toastify GitHub](https://github.com/fkhadra/react-toastify)
- [Notistack GitHub](https://github.com/iamhosseindhv/notistack)
- [Novu GitHub](https://github.com/novuhq/novu)
- [Knock React SDK](https://github.com/knocklabs/react-notification-feed)
- [MagicBell JS SDK](https://github.com/magicbell/magicbell-js)
- [shadcn/ui Sonner docs](https://ui.shadcn.com/docs/components/radix/sonner)
- [Knock Blog — Top 9 React Notification Libraries](https://knock.app/blog/the-top-notification-libraries-for-react)
- [LogRocket — React Toast Libraries Compared 2025](https://blog.logrocket.com/react-toast-libraries-compared-2025/)
- [Novu Blog — Building React Components for Real-Time Notifications](https://novu.co/blog/building-open-source-react-components-for-real-time-notifications/)
