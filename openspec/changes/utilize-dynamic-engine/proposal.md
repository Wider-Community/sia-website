# Change: Utilize Dynamic Component Engine Across SIA Platform

## Why

The Dynamic Component Engine is built (38 modules, Control Board UI, all engine layers) but not yet utilized by the platform. Definitions can be created in the Control Board but users can't run flows, see dynamic forms, or experience the engine's value. The engine must be wired into real user-facing experiences to deliver its promise: zero-code-change UX configuration.

## What Changes

- Add a **Flow Runner** page where users step through dynamic flows stage-by-stage with real-time branching
- Add a **Dynamic Form Renderer** that replaces hardcoded form pages with engine-driven forms
- Wire the **Playground** into the Control Board for live definition testing
- Add **engine initialization** to the portal sidebar navigation
- Create **seed data** so the engine is immediately useful (pre-built definitions for SIA's core entities)
- Integrate the **DynamicKanban** into the pipeline/tasks views for flow-stage visualization
- Integrate **DynamicFilterPanel** into list pages for schema-driven advanced filtering
- Add **notification center** integration so engine notifications appear in the portal UI

## Impact

- Affected specs: New capability (engine-utilization)
- Affected code: Router, sidebar, portal pages, existing list/form pages
- Affected UX: Users gain access to dynamic flows, configurable forms, and real-time notifications
