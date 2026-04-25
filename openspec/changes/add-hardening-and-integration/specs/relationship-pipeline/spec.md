## ADDED Requirements

### Requirement: Relationship Pipeline Stages
The system SHALL track each organization's relationship stage through a defined lifecycle: `prospect` → `engaged` → `due_diligence` → `negotiation` → `active_partner` → `inactive`. The `stage` field SHALL be stored on the organization record.

#### Scenario: New organization defaults to prospect
- **WHEN** a new organization is created without an explicit stage
- **THEN** the stage SHALL default to `prospect`

#### Scenario: Stage change is logged
- **WHEN** an organization's stage changes from `engaged` to `due_diligence`
- **THEN** an activity event SHALL be created recording the stage transition with `from` and `to` values

### Requirement: Kanban Pipeline View
The system SHALL provide a Kanban board view accessible from the sidebar where organizations are displayed as cards in columns representing pipeline stages. Users SHALL drag cards between columns to change an organization's stage.

#### Scenario: User views pipeline board
- **WHEN** user navigates to the Pipeline page
- **THEN** the system SHALL display columns for each stage with organization cards showing name, type, and last activity date

#### Scenario: User drags organization to new stage
- **WHEN** user drags an org card from "engaged" to "due_diligence"
- **THEN** a confirmation dialog SHALL appear
- **AND** on confirm, the organization's stage SHALL be updated
- **AND** an activity event SHALL be logged

### Requirement: Pipeline Analytics
The system SHALL display pipeline analytics including count per stage, conversion rates between stages, and average time-in-stage.

#### Scenario: Dashboard shows pipeline summary
- **WHEN** user views the dashboard
- **THEN** a pipeline summary widget SHALL show the count of organizations in each stage
- **AND** a funnel or bar chart SHALL visualize the distribution
