# Dynamic Component Engine — Testing Guide

## Prerequisites

1. Start the dev server: `cd app && npx vite`
2. Open the app and sign in at `/portal/login`
3. Navigate to `/portal/control-board`

---

## Test 1: Create a Component Definition

1. You should see the **Components** tab active with an empty table
2. Click **"Create Definition"** button (top right)
3. Fill in the dialog:
   - **Slug**: `company-name`
   - **Category**: select `field`
   - **Renderer**: type `TextFieldRenderer`
   - **Status**: select `published`
   - **Data Schema**: paste:
     ```json
     {"type": "string", "minLength": 1}
     ```
   - **Default Config**: paste:
     ```json
     {}
     ```
   - **EN Label**: `Company Name`
   - **EN Placeholder**: `Enter company name...`
   - **AR Label**: `اسم الشركة`
   - **AR Placeholder**: `أدخل اسم الشركة...`
4. Click **Save**
5. **Expected**: New row appears in table with slug=company-name, category=field, status=published

## Test 2: Create More Components

Repeat Test 1 for these (to have enough for a flow):

| Slug | Category | Renderer | EN Label | Data Schema | Default Config |
|------|----------|----------|----------|-------------|----------------|
| `sector-select` | `field` | `SelectRenderer` | `Sector` | `{"type": "string"}` | See below |
| `deal-size` | `field` | `NumberFieldRenderer` | `Deal Size (USD)` | `{"type": "number", "minimum": 0}` | `{}` |
| `company-description` | `field` | `TextAreaRenderer` | `Description` | `{"type": "string", "maxLength": 2000}` | `{}` |

Default Config for `sector-select`:
```json
{
  "options": [
    {"value": "technology", "label": "Technology"},
    {"value": "energy", "label": "Energy"},
    {"value": "finance", "label": "Finance"}
  ]
}
```

## Test 3: Edit a Component

1. Click the **pencil icon** on the `company-name` row
2. Change EN Placeholder to `e.g. Acme Corporation`
3. Click **Save**
4. **Expected**: Row updates with new data

## Test 4: Delete a Component

1. Click the **trash icon** on `company-description`
2. Confirm deletion
3. **Expected**: Row disappears from table

---

## Test 5: Create a Flow

1. Click the **Flows** tab
2. Click **"Create Flow"**
3. Fill in:
   - **Slug**: `org-matching`
   - **Status**: `active`
   - **Name (EN)**: `Organization Matching`
   - **Name (AR)**: `مطابقة المنظمات`
   - **Description**: `Match two organizations for a deal`
4. **Add stages** (click "Add Stage" 3 times):

   **Stage 1:**
   - Slug: `basic-info`
   - Label EN: `Basic Information`
   - Label AR: `المعلومات الأساسية`
   - isTerminal: unchecked

   **Stage 2:**
   - Slug: `sector-details`
   - Label EN: `Sector Details`
   - Label AR: `تفاصيل القطاع`
   - isTerminal: unchecked

   **Stage 3:**
   - Slug: `review`
   - Label EN: `Review & Submit`
   - Label AR: `مراجعة وإرسال`
   - isTerminal: **checked**

5. Set **Entry Stage** to `basic-info` (select from dropdown)
6. Click **Save**
7. **Expected**: Flow appears in table with 3 stages

## Test 6: Add Branching to a Flow

1. Click **edit** on the `org-matching` flow
2. On **Stage 1 (basic-info)**, find the **Transitions** section
3. Add a transition:
   - **Target**: `sector-details`
   - **Priority**: `1`
   - **Logic**: `AND`
   - Add a condition: **Field** = `sector`, **Operator** = `eq`, **Value** = `technology`
4. Add another transition (default/fallback):
   - **Target**: `review`
   - **Priority**: `10`
   - No conditions (leave empty — this is the fallback)
5. Save
6. **Expected**: Flow saved with branching logic. If sector equals "technology" the user goes to sector-details, otherwise they go straight to review.

---

## Test 7: Create a Notification

1. Click the **Notifications** tab
2. Click **"Create Notification"**
3. Fill in:
   - **Slug**: `stage-completed-alert`
   - **Enabled**: toggle ON
   - **Priority**: `high`
   - **Trigger Event**: select `stage.submitted`
   - **Add a channel**: select `in_app`
   - **EN Subject**: `Stage completed`
   - **EN Body**: `User {{userId}} completed stage {{stageId}} in flow {{flowId}}`
   - **AR Subject**: `تم إكمال المرحلة`
   - **AR Body**: `أكمل المستخدم {{userId}} المرحلة {{stageId}}`
   - **Recipient Type**: `role`
   - **Roles**: `admin`
4. Click **Save**
5. **Expected**: Notification appears in table with enabled toggle, channel badge, priority badge

## Test 8: Test a Notification

1. Click the **flask icon** (test) on your notification row
2. **Expected**: Dialog shows interpolated template preview with sample data
3. Click **"Send Test"**
4. **Expected**: Success indicator appears (event emitted on engine bus)

## Test 9: Toggle Notification On/Off

1. Click the **enabled toggle** directly in the table row
2. **Expected**: Toggles between enabled/disabled without opening a dialog

## Test 10: Check Attachment Matrix

1. Scroll below the notifications table
2. **Expected**: Visual matrix showing which notifications are attached to which event types. Rows are notification definitions, columns are event types. Colored checkmarks indicate attachments.

## Test 11: Check Notification Analytics

1. Scroll further down in the Notifications tab
2. **Expected**: Analytics section with summary cards (total fired, unique, escalations, channels) and charts. Initially empty — charts populate after test notifications are fired.

---

## Test 12: Assign a Role

1. Click the **Authorization** tab
2. In the **Role Management** section, enter a User ID (e.g., `user-1`)
3. Click **"Look Up"** or the search button
4. Click **"Assign Role"**
5. Select `engine_superadmin`
6. Click **Assign**
7. **Expected**: Role appears in the user's role list

## Test 13: Grant a Permission

1. In the **Permission Grants** section
2. Click **"Grant Permission"**
3. Fill in:
   - Subject Type: `user`
   - Subject ID: `user-1`
   - Permission: `owns`
   - Resource Type: `flow_definition`
   - Resource ID: `*` (wildcard — all flows)
4. Click **Grant**
5. **Expected**: Grant appears in the grants table

## Test 14: Test Authorization

1. In the **Authorization Test** section
2. Fill in:
   - User ID: `user-1`
   - Action: `update`
   - Resource Type: `flow_definition`
   - Resource ID: any string (or a real flow ID from the Flows tab)
3. Click **"Check"**
4. **Expected**: Shows "Allowed" (green) with effective permissions listed

## Test 15: Test Authorization Denial

1. In the **Authorization Test** section
2. Fill in:
   - User ID: `unknown-user`
   - Action: `delete`
   - Resource Type: `component_definition`
   - Resource ID: any string
3. Click **"Check"**
4. **Expected**: Shows "Denied" (red) with reason (no role assigned)

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Blank page at /portal/control-board | Not logged in | Go to /portal/login first |
| "Engine not initialized" error in console | `VITE_USE_MOCK=true` in .env | Remove or set to `false` — engine only initializes with real Mujarrad |
| Table stays empty after save | Mujarrad API unreachable | Check browser Network tab for 401/500 errors. Verify API URL in .env |
| Save fails silently | Validation error or API error | Check browser console (F12) for error messages |
| "Unknown resource" error | Entity registry not updated | Restart dev server to pick up new entity-registry.ts entries |

## Browser Console

Open **F12 > Console** while testing. The engine logs:
- `[EngineEventBus]` — events emitted and handler errors
- `[ECL]` — entity control layer relationship operations
- Notification dispatch logs when notifications fire

## What Requires Mujarrad API

All CRUD operations (create/edit/delete components, flows, notifications, permissions) require the Mujarrad backend to be running and accessible. The engine stores everything as Mujarrad nodes.

## What Won't Work Yet

- **WebSocket real-time updates**: Needs server-side WebSocket endpoint. The client degrades gracefully to polling, which also requires a `/api/engine/changes` endpoint.
- **Actual email/SMS/push delivery**: Notifications emit events on the bus but don't send real emails or push notifications. Channel integrations are deferred.
- **Agentic suggestions**: The SuggestionEngine framework is ready but no AI agent is connected yet. Suggestions can be manually created via the API.
