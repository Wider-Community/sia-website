## ADDED Requirements

### Requirement: Email Sending Service
The system SHALL integrate with an email provider (Resend) to send emails from the EmailComposeModal and signing notification flows. All sent emails SHALL be logged as activity events.

#### Scenario: User sends email from compose modal
- **WHEN** user fills to/subject/body and clicks Send
- **THEN** the email SHALL be sent via the email provider API
- **AND** an `email_sent` activity event SHALL be created with recipient and subject

### Requirement: Signing Email Notifications
The system SHALL send email notifications for signing workflow events: request sent, reminder, completion, and decline.

#### Scenario: Signing request sent
- **WHEN** admin sends a signing request to signers
- **THEN** each signer SHALL receive an email with a link to the public signing page

#### Scenario: Signing reminder
- **WHEN** admin clicks "Resend" on a pending signer
- **THEN** the signer SHALL receive a reminder email with the signing link

#### Scenario: Signing completed
- **WHEN** all signers have signed a document
- **THEN** the admin SHALL receive an email notification with a download link
