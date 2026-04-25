## ADDED Requirements

### Requirement: Geographic Map Visualization
The system SHALL provide a map page displaying organizations as markers on a world map, positioned by their `country` field. Markers SHALL be colored by relationship stage and clustered when zoomed out.

#### Scenario: User views organization map
- **WHEN** user navigates to the Map page
- **THEN** the system SHALL render an SVG world map with markers for each organization
- **AND** each marker SHALL be colored according to the organization's pipeline stage

#### Scenario: User clicks a map marker
- **WHEN** user clicks on an organization marker
- **THEN** the system SHALL show a tooltip with org name, stage, and type
- **AND** clicking the tooltip SHALL navigate to the organization detail page

### Requirement: Map Filtering
The system SHALL support filtering map markers by pipeline stage, organization type, and status.

#### Scenario: User filters map by stage
- **WHEN** user selects "active_partner" from the stage filter
- **THEN** only organizations in the `active_partner` stage SHALL be displayed on the map
