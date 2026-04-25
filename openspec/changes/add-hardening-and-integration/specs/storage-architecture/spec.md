## ADDED Requirements

### Requirement: Multi-Tenant R2 Folder Structure
The system SHALL organize R2 storage in a user-scoped hierarchy where each user owns a top-level folder identified by their UID, containing subfolders for profile files, templates, and organizations.

#### Scenario: User uploads a file to an organization
- **WHEN** user `user-1` uploads `report.pdf` to organization `org-4` (Mubadala Investment Company)
- **THEN** the file SHALL be stored at `user-1/organizations/org-4-mubadala-investment-company/files/{fileId}-report-pdf/original/report.pdf`

#### Scenario: User uploads a personal template
- **WHEN** user `user-1` uploads `nda-template.docx` to their templates
- **THEN** the file SHALL be stored at `user-1/templates/nda-template.docx`

### Requirement: File Versioning Across Stages
The system SHALL maintain separate folders for each version of a file across its lifecycle stages (original, pre-signed, post-signed). Each stage folder contains the file version relevant to that stage.

#### Scenario: Document signing lifecycle
- **WHEN** a file is uploaded and then sent for signing
- **THEN** the original file SHALL exist at `.../original/report.pdf`
- **AND** the version sent for signing SHALL exist at `.../pre-signed/report.pdf`
- **AND** the completed signed version SHALL exist at `.../post-signed/report-signed.pdf`

### Requirement: Folder Browser UI
The system SHALL provide a folder browser interface within the Files tab that supports navigation into subfolders, breadcrumb navigation, and folder creation.

#### Scenario: User navigates organization file tree
- **WHEN** user opens the Files tab for an organization
- **THEN** the system SHALL display folders and files at the current level
- **AND** clicking a folder SHALL navigate into it
- **AND** a breadcrumb trail SHALL show the current path

#### Scenario: User creates a subfolder
- **WHEN** user clicks "New Folder" and enters a name
- **THEN** a new folder prefix SHALL be created in R2

### Requirement: Upload Server Path Support
The upload server SHALL accept an optional `path` query parameter to place files in specific subfolders within the R2 hierarchy.

#### Scenario: Upload with path parameter
- **WHEN** a POST request is sent to `/upload?orgId=org-4&fileName=report.pdf&path=contracts`
- **THEN** the file SHALL be stored at `{userId}/organizations/{orgId}-{slug}/contracts/report.pdf`

### Requirement: File Download from R2
The system SHALL enable direct file download from R2 via the upload server's `/download` endpoint, triggered by the download button in the Files tab.

#### Scenario: User downloads a file
- **WHEN** user clicks the download button on a file row
- **THEN** the browser SHALL initiate a download of the file from R2 via the server proxy
