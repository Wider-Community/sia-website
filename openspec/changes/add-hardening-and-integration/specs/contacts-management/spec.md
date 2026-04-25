## ADDED Requirements

### Requirement: Standalone Contacts Page
The system SHALL provide a dedicated Contacts page in the sidebar with full CRUD operations independent of the organization context. Contacts MAY be linked to one or more organizations.

#### Scenario: User views all contacts
- **WHEN** user navigates to the Contacts page
- **THEN** the system SHALL display a searchable, sortable table of all contacts with name, email, phone, role, and linked organizations

#### Scenario: User creates a contact
- **WHEN** user fills the contact form with name, email, phone, role, and optionally selects an organization
- **THEN** the contact SHALL be created and linked to the selected organization if provided

### Requirement: Contact Detail Page
The system SHALL provide a contact detail page showing the contact's information, linked organizations, activity history, and associated files.

#### Scenario: User views contact detail
- **WHEN** user clicks on a contact row
- **THEN** the system SHALL display the contact's full profile with tabs for Overview, Organizations, Activity, and Files
