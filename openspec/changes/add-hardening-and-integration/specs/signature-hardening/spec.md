## ADDED Requirements

### Requirement: Signer Decline Flow
The system SHALL allow signers to decline a signing request with an optional reason. Declining SHALL update the signer status to `declined` and notify the admin.

#### Scenario: Signer declines
- **WHEN** a signer clicks "Decline" on the public signing page and provides a reason
- **THEN** the signer's status SHALL change to `declined`
- **AND** an activity event SHALL be logged
- **AND** the admin SHALL be notified

### Requirement: Signing Audit Trail
The system SHALL log timestamped events for each step of the signing process: document viewed, field signed, request declined, and request completed.

#### Scenario: Signer views document
- **WHEN** a signer opens the public signing page
- **THEN** a `signing_viewed` event SHALL be logged with the signer ID and timestamp

#### Scenario: Signer signs a field
- **WHEN** a signer completes signing a field
- **THEN** a `field_signed` event SHALL be logged with field ID, signer ID, and timestamp

### Requirement: Token Expiration
Signing tokens SHALL have a configurable expiration period (default 30 days). Expired tokens SHALL show an error page directing the signer to contact the admin.

#### Scenario: Token expired
- **WHEN** a signer accesses a signing link after the token has expired
- **THEN** the system SHALL display an expiration message instead of the signing interface

### Requirement: Resend Signing Request
The admin SHALL be able to resend the signing email to pending signers, generating a fresh token if the original has expired.

#### Scenario: Admin resends to pending signer
- **WHEN** admin clicks "Resend" on a pending signer in the signing detail page
- **THEN** a new email SHALL be sent with a valid signing link
- **AND** an activity event SHALL be logged
