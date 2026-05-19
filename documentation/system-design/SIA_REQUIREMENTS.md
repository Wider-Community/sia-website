# SIA Requirements

**Version:** 1.0
**Date:** May 2026

---

## Product Overviewseed

SIA is implemented as a bifurcated product:

- A public marketing website at `/` that positions the Saudi Arabia ↔ Malaysia corridor and converts visitors into portal users.
- A private authenticated portal at `/portal` for SIA operators and partners to manage organizations, contacts, deals, matches, tasks, documents, and workflows.
- A control board at `/portal/control-board` for internal engine administration, dynamic component definition, flow authoring, notification configuration, authorization management, and reference data.

## Functional Requirements

### Public Website (`/`)

- Serve a marketing landing page for SIA.
- Clearly communicate the Saudi Arabia ↔ Malaysia investment corridor.
- Support English + Arabic presentation.
- Focus on investor and company conversion.
- Provide calls to action that lead visitors to portal sign-up/login.
seed or reset the engine from the control board.

### SIA Portal (`/portal`)

- Authenticate users with email/password and optional Google OAuth.
- Display an operations dashboard with KPI cards, activity ticker, SLA health, and recent events.
- Manage organizations: list, create, edit, and detail view.
- Manage contacts: list, create, edit, and detail view.
- Manage engagements: list, create, edit, detail, pipeline view, and workflow-driven engagement flows. 
- Manage matches: list, create, detail, match flow view, kanban view, and mutual match tracking.
- Manage tasks: list, board view, create, edit, and detail view.
- Support signing workflows: signing request list, new request creation, request detail, and public signing page.
- Provide pipeline pages: static and dynamic pipeline visualization.
- Display a geographic map page for visual analytics.
- Support SLA rules and evaluation settings.

### Control Board (`/portal/control-board`)

- Maintain a component registry for dynamic UI/form component definitions.
- Provide a flow designer and flow management controls.
- Manage notifications, templates, and trigger definitions.
- Provide authorization management tools.
- Manage reference data sets.
- Offer an engine playground for testing dynamic behavior.
- Include controls to seed, re-seed, and clear the engine.

## Non-Functional Requirements

- The portal is gated behind authenticated access.
- The app uses a modern, fast front-end toolchain for development and production (`Vite`).
- The site supports bilingual presentation and localization.
- The portal is structured for responsive dashboard, list, and workflow management interfaces.
- The control board supports internal engine administration without exposing those tools publicly.

## Tech Stack

- Front-end: `React`, `TypeScript`, `Vite`, `Tailwind CSS`.
- UI framework: `Refine` for authenticated data-driven admin flows.
- Routing: `react-router-dom`.
- Component/library ecosystem: `lucide-react`, `@dnd-kit/core`, `framer-motion`, `recharts`, `react-pdf`, `react-signature-canvas`, `zustand`, `@refinedev/*`.
- Portal engine: custom dynamic component/flow/notification engine under `app/src/portal/engine`.
- Data handling: mock and `mujarrad` data providers in `app/src/portal/providers`.
- Document workflow: PDF viewer and signature capture components.

## Use Cases

- As a portal user, log in and view the operations dashboard.
- As a portal user, add or update organizations and contacts.
- As a portal user, create and manage engagements and deal pipelines.
- As a portal user, establish matches and track mutual match status.
- As a portal user, create tasks, move them on a board, and view details.
- As a portal user, issue signing requests and review signing details.
- As a portal user, navigate the map and pipeline visualization pages.
- As a portal user, launch and run multi-stage flows with dynamic stages.
- As an internal operator, author and manage component definitions.
- As an internal operator, build and maintain flow definitions.
- As an internal operator, configure and manage notification definitions.
- As an internal operator, manage authorization rules and reference data.
- As an internal operator, seed or reset the engine from the control board.
