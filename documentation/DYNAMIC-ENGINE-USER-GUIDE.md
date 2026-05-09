# Dynamic Engine — User Guide

> A plain-language guide to using the SIA Dynamic Engine from the Control Board.

---

## What Is the Dynamic Engine?

The Dynamic Engine lets you build **custom forms, multi-step workflows, and automated notifications** — all without writing code. Think of it as three tools in one:

| Tool | What It Does | Analogy |
|------|-------------|---------|
| **Components** | Define the individual fields and inputs users fill out | Building blocks (like a text box, dropdown, or file upload) |
| **Flows** | Chain components into multi-step processes with logic | A guided wizard (like a step-by-step onboarding form) |
| **Notifications** | Send alerts when things happen in a flow | Automated email/message rules |

---

## Getting Started

1. Open the app and sign in
2. Go to **Control Board** from the sidebar
3. You'll see three tabs at the top: **Components**, **Flows**, **Notifications**, and **Authorization**

---

## Part 1: Components (Your Building Blocks)

A **component** is a single piece of a form — a text field, a dropdown, a number input, etc.

### How to Create a Component

1. Make sure you're on the **Components** tab
2. Click **"Create Definition"** (top right)
3. Fill in the form:

| Field | What to Enter | Example |
|-------|--------------|---------|
| **Slug** | A short unique ID (no spaces, use dashes) | `company-name` |
| **Category** | What kind of component — pick `field` for form inputs | `field` |
| **Renderer** | What type of input to show (see table below) | `TextFieldRenderer` |
| **Status** | Set to `published` when ready to use | `published` |
| **Data Schema** | What kind of data this field accepts (see examples below) | `{"type": "string"}` |
| **Default Config** | Extra settings for the field (use `{}` if none) | `{}` |
| **EN Label** | English label shown above the field | `Company Name` |
| **EN Placeholder** | Hint text shown inside the field | `Enter company name...` |
| **AR Label** | Arabic label | `اسم الشركة` |
| **AR Placeholder** | Arabic hint text | `أدخل اسم الشركة...` |

4. Click **Save**

### Available Input Types (Renderers)

| Renderer Name | What It Shows | Use For |
|---------------|--------------|---------|
| `TextFieldRenderer` | Single-line text box | Names, emails, short text |
| `TextAreaRenderer` | Multi-line text box | Descriptions, notes |
| `NumberFieldRenderer` | Number-only input | Amounts, quantities |
| `SelectRenderer` | Dropdown menu | Pick one from a list |
| `MultiSelectRenderer` | Multi-select dropdown | Pick several from a list |
| `ToggleRenderer` | On/off switch | Yes/no questions |
| `DatePickerRenderer` | Date selector | Dates, deadlines |

### Data Schema Examples

The "Data Schema" field tells the system what kind of data to expect. Here are ready-to-use examples:

**Plain text:**
```json
{"type": "string"}
```

**Text with minimum length (required):**
```json
{"type": "string", "minLength": 1}
```

**Text with maximum length:**
```json
{"type": "string", "maxLength": 2000}
```

**Number:**
```json
{"type": "number"}
```

**Number that must be positive:**
```json
{"type": "number", "minimum": 0}
```

**Boolean (true/false):**
```json
{"type": "boolean"}
```

### Default Config for Dropdowns

If your component is a dropdown (`SelectRenderer` or `MultiSelectRenderer`), you need to list the options in Default Config:

```json
{
  "options": [
    {"value": "technology", "label": "Technology"},
    {"value": "energy", "label": "Energy"},
    {"value": "finance", "label": "Finance"}
  ]
}
```

For all other input types, just use `{}`.

### How to Edit a Component

1. Click the **pencil icon** on the component's row
2. Change whatever you need
3. Click **Save**

### How to Delete a Component

1. Click the **trash icon** on the component's row
2. Confirm the deletion

---

## Part 2: Flows (Your Multi-Step Processes)

A **flow** is a sequence of stages (steps) that guide a user through a process. Each stage contains one or more components.

### How to Create a Flow

1. Click the **Flows** tab
2. Click **"Create Flow"**
3. Fill in the basic info:

| Field | What to Enter | Example |
|-------|--------------|---------|
| **Slug** | Unique ID for this flow | `org-onboarding` |
| **Status** | Set to `active` when ready | `active` |
| **Name (EN)** | English name | `Organization Onboarding` |
| **Name (AR)** | Arabic name | `تأهيل المنظمات` |
| **Description** | What this flow does | `Collect basic info about a new organization` |

4. **Add stages** by clicking "Add Stage" for each step you want:

For each stage, fill in:

| Field | What It Means |
|-------|--------------|
| **Slug** | Unique ID for this stage (e.g., `basic-info`) |
| **Label EN** | English name shown to the user (e.g., `Basic Information`) |
| **Label AR** | Arabic name |
| **isTerminal** | Check this box for the **last stage only** — this tells the system "the flow ends here" |

5. Set the **Entry Stage** — pick which stage the user sees first
6. Click **Save**

### Example: A 3-Step Flow

| Stage | Slug | Label | Terminal? |
|-------|------|-------|-----------|
| Step 1 | `basic-info` | Basic Information | No |
| Step 2 | `details` | Details | No |
| Step 3 | `review` | Review & Submit | **Yes** |

Entry Stage: `basic-info`

### Adding Branching (Conditional Paths)

You can make the flow **skip stages or take different paths** based on what the user enters.

**Example:** If the user selects "Technology" as their sector, send them to a tech-specific stage. Otherwise, skip straight to review.

1. Edit the flow
2. On a stage, find the **Transitions** section
3. Add a transition:
   - **Target**: Which stage to go to (e.g., `tech-details`)
   - **Priority**: Lower number = checked first (use `1` for specific rules, `10` for the default/fallback)
   - **Logic**: `AND` (all conditions must match) or `OR` (any condition can match)
   - **Conditions**: The rule to check (e.g., Field = `sector`, Operator = `eq`, Value = `technology`)
4. Add a **fallback transition** with no conditions and a higher priority number — this is where users go if no rules match
5. Save

### How Users Experience a Flow

1. User opens the flow (from a page you've linked it to)
2. They see the first stage with its form fields
3. They fill in the fields and click **Next**
4. The system evaluates any branching rules and shows the right next stage
5. They can click **Back** to revise previous stages
6. When they reach the terminal stage and submit, the flow is complete
7. All their data is saved

---

## Part 3: Notifications (Automated Alerts)

Notifications let you **automatically alert people** when something happens in a flow.

### How to Create a Notification

1. Click the **Notifications** tab
2. Click **"Create Notification"**
3. Fill in:

| Field | What It Means | Example |
|-------|--------------|---------|
| **Slug** | Unique ID | `stage-completed-alert` |
| **Enabled** | Turn on/off | Toggle ON |
| **Priority** | How urgent | `high`, `medium`, or `low` |
| **Trigger Event** | What causes this notification | `stage.submitted` |
| **Channel** | How to deliver it | `in_app` |
| **EN Subject** | English title | `Stage completed` |
| **EN Body** | English message (use `{{placeholders}}`) | `User {{userId}} completed stage {{stageId}}` |
| **AR Subject** | Arabic title | `تم إكمال المرحلة` |
| **AR Body** | Arabic message | `أكمل المستخدم {{userId}} المرحلة {{stageId}}` |
| **Recipient Type** | Who gets it | `role` |
| **Roles** | Which role(s) | `admin` |

4. Click **Save**

### Available Trigger Events

| Event | When It Fires |
|-------|--------------|
| `flow.started` | A user begins a flow |
| `flow.completed` | A user finishes a flow |
| `flow.abandoned` | A user abandons a flow |
| `stage.entered` | A user enters a new stage |
| `stage.submitted` | A user submits a stage |
| `match.discovered` | A new match is found |
| `match.accepted` | A match is accepted |
| `match.rejected` | A match is rejected |

### Template Placeholders

Use `{{variableName}}` in your notification body to insert dynamic values:

- `{{userId}}` — the user who triggered the event
- `{{flowId}}` — the flow ID
- `{{stageId}}` — the stage ID
- `{{sessionId}}` — the session ID

### How to Test a Notification

1. Click the **flask icon** on the notification row
2. A preview dialog appears showing what the notification will look like with sample data
3. Click **"Send Test"** to fire a test notification

### How to Enable/Disable a Notification

Click the **enabled toggle** directly on the notification row — no need to open the editor.

### Attachment Matrix

Below the notifications table, there's a visual grid showing which notifications are connected to which events. This helps you see your coverage at a glance.

---

## Part 4: Authorization (Who Can Do What)

The Authorization tab controls **permissions** — who can create, edit, or delete components and flows.

### Assigning a Role

1. Click the **Authorization** tab
2. Enter a User ID and click **Look Up**
3. Click **"Assign Role"** and pick a role (e.g., `engine_superadmin`)

### Granting Specific Permissions

1. In the **Permission Grants** section, click **"Grant Permission"**
2. Fill in:
   - **Subject**: Who gets the permission (user or role)
   - **Permission**: What they can do (e.g., `owns`, `update`)
   - **Resource**: What they can do it to (e.g., `flow_definition`, `component_definition`)
   - **Resource ID**: Specific item or `*` for all

### Testing Permissions

Use the **Authorization Test** section to check if a specific user can perform a specific action before deploying.

---

## Pre-Built Templates

The engine comes with **3 ready-made templates** that are automatically set up when the system initializes. You can use them as-is or as inspiration:

### 1. Organization Onboarding
- **Purpose:** Collect info about a new organization
- **Stages:** Basic Info -> Sector Selection -> Contact Details
- **Fields:** Organization name, country, type, sector, sub-sectors, contact name, email, phone

### 2. Deal Matching
- **Purpose:** Match organizations for potential deals
- **Stages:** Org Profile -> Matching Criteria -> (Energy-specific stage if applicable) -> Preferences -> Review
- **Fields:** Organization summary, deal size, sector, target countries, timeline, partnership type
- **Smart branching:** Energy sector deals get an extra dedicated stage

### 3. Due Diligence
- **Purpose:** Document review and compliance checking
- **Stages:** Document Upload -> Compliance Check -> Approval
- **Fields:** Company/financial/legal document uploads, KYC status, sanctions check, approval decision

---

## What Works Now vs. What's Coming

| Feature | Status | Notes |
|---------|--------|-------|
| Creating/editing/deleting components | **Working** | Fully functional |
| Creating/editing/deleting flows | **Working** | Including branching logic |
| Running flows (step-by-step wizard) | **Working** | Start, navigate, submit, go back |
| Flow branching (conditional paths) | **Working** | Based on field values |
| Creating notifications | **Working** | All trigger events supported |
| In-app notification delivery | **Working** | Shows as toast popups |
| Email/SMS/push notification delivery | **Not yet** | Only in-app works; other channels are planned |
| Authorization & permissions | **Working** | Role assignment, permission grants, testing |
| Pre-built templates | **Working** | 3 templates auto-created on first run |
| Viewing your active flow sessions | **Not yet** | Session list page shows empty; backend endpoint needed |
| Real-time live updates (WebSocket) | **Not yet** | Falls back to page refresh; needs server-side WebSocket |
| AI-powered suggestions | **Not yet** | Framework is built but no AI connected |
| Dual language (English/Arabic) | **Working** | All components support both languages |

---

## Tips

- **Start small:** Create a simple 2-stage flow with 2-3 components to get comfortable before building complex workflows
- **Use the templates:** Look at the pre-built templates for examples of how to structure flows
- **Test notifications:** Always use the flask/test button before relying on a notification in production
- **Check the console:** If something doesn't seem to work, open browser DevTools (F12) and check the Console tab for error messages
- **Branching needs a fallback:** When adding conditional transitions, always add a fallback transition (no conditions, high priority number) so users don't get stuck
