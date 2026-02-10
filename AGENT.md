Below is the **same `agent.md` content**, rewritten cleanly as a **plain text file** (no markdown styling dependencies, safe for Codex / Copilot / Cursor / Claude agents to ingest).

You can save this **exactly as `agent.md` or `agent.txt`** at the root of your repo.

---

AGENT CONTEXT FILE
PROJECT: Visual Database Diagram Web App (Laravel 10 + Breeze)

================================================================

## PROJECT OVERVIEW

This web application is a visual database schema design tool similar to Skemato.
Users can visually design database schemas using drag-and-drop tables, columns,
and relationships. Diagrams can belong to an individual user or a team.

The application uses:

* Laravel 10 (backend)
* Laravel Breeze (authentication)
* Inertia.js + React (frontend)
* React Flow (diagram canvas)
* REST JSON APIs
* MySQL/PostgreSQL database

================================================================

## CORE FEATURES

1. Authentication using Laravel Breeze
2. Multi-team support (users can belong to multiple teams)
3. Diagrams owned by either users or teams
4. Visual diagram editor with drag-and-drop tables
5. Column-level relationship connections
6. Autosave of diagram layout and state
7. Permissions enforced via Laravel Policies

================================================================

## USER & TEAM LOGIC

* Users authenticate via Breeze.
* A user can belong to multiple teams.
* Teams have roles: member, admin, owner.
* A diagram can be owned by:

  * A single user (personal diagram)
  * A team (shared diagram)

Permissions:

* Personal diagram: only owner can view/edit.
* Team diagram:

  * Any team member can view.
  * Only admin or owner can edit or delete.

================================================================

## DOMAIN MODELS

## User

* Standard Breeze user model.
* Relationships:

  * belongsToMany Team (with role)
  * hasMany owned diagrams
* Helper methods:

  * isTeamOwner(team)
  * hasTeamRole(team, roles)

## Team

Fields:

* id
* name
* owner_user_id

Relationships:

* owner(): belongsTo User
* users(): belongsToMany User with pivot role
* diagrams(): morphMany Diagram

## Diagram

Fields:

* id
* owner_type (User or Team)
* owner_id
* name
* description
* viewport (json: x, y, zoom)
* timestamps

Relationships:

* morphTo owner
* hasMany DiagramTable
* hasMany DiagramRelationship

## DiagramTable

Represents a visual table node.

Fields:

* id
* diagram_id
* name
* schema (optional)
* x, y (position)
* w, h (size)

Relationships:

* belongsTo Diagram
* hasMany DiagramColumn

## DiagramColumn

Represents a table column.

Fields:

* id
* diagram_table_id
* name
* type
* nullable
* primary
* unique
* default

Relationships:

* belongsTo DiagramTable

## DiagramRelationship

Represents a visual edge between two columns.

Fields:

* id
* diagram_id
* from_column_id
* to_column_id
* type (one_to_one, one_to_many, many_to_many)
* on_delete
* on_update

Relationships:

* belongsTo Diagram
* belongsTo DiagramColumn (from and to)

================================================================

## DATABASE STRUCTURE

Tables:

* users
* teams
* team_user (pivot)
* diagrams
* diagram_tables
* diagram_columns
* diagram_relationships

Key rules:

* team_user is unique per (team_id, user_id)
* table names unique per diagram
* column names unique per table
* relationships must link columns from same diagram

================================================================

## AUTHORIZATION (POLICIES)

DiagramPolicy:

* view: owner OR team member
* update: owner OR team admin/owner
* delete: owner OR team admin/owner

All write operations must pass policy checks.

================================================================

## API DESIGN

## Diagram Endpoints

GET /api/v1/diagrams

* Returns diagrams user can access (personal + team)

POST /api/v1/diagrams

* Create new diagram
* Owner may be user or team

GET /api/v1/diagrams/{id}

* Returns full diagram graph:

  * tables
  * columns
  * relationships
  * viewport

PATCH /api/v1/diagrams/{id}

* Update name, description, viewport

DELETE /api/v1/diagrams/{id}

* Delete diagram

## Diagram Table Endpoints

POST /api/v1/diagram-tables

* Add table to diagram

PATCH /api/v1/diagram-tables/{id}

* Update name or position/size

DELETE /api/v1/diagram-tables/{id}

* Delete table and its columns

## Diagram Column Endpoints

POST /api/v1/diagram-columns

* Add column to table

PATCH /api/v1/diagram-columns/{id}

* Update column metadata

DELETE /api/v1/diagram-columns/{id}

* Delete column

## Diagram Relationship Endpoints

POST /api/v1/diagram-relationships

* Create relationship between two columns

DELETE /api/v1/diagram-relationships/{id}

* Remove relationship

================================================================

## FRONTEND STRUCTURE (INERTIA + REACT)

Pages:

* Diagrams/Index.jsx

  * Lists personal and team diagrams
  * Create diagram modal
* Diagrams/Editor.jsx

  * Main canvas editor

Components:

* DiagramEditor.jsx
* TableNode.jsx
* ColumnRow.jsx
* RelationshipEdge.jsx

================================================================

## DIAGRAM EDITOR LOGIC

DiagramEditor:

* Uses React Flow.
* Loads diagram data from API.
* Converts tables into nodes.
* Converts relationships into edges.
* Handles pan, zoom, drag, connect events.

TableNode:

* Displays table name.
* Lists columns.
* Each column has connection handles.
* Supports inline editing.

Interactions:

* Drag table → update x/y on drag end.
* Add table → API call → node added.
* Add column → API call → column rendered.
* Create relationship → connect handles → API call.
* Remove items → API call → canvas update.

Autosave:

* Viewport state saved with debounce.
* Table position saved on drag end.
* Visual saving indicator shown.

================================================================

## STATE MANAGEMENT

* Diagram state lives in React component.
* API is source of truth.
* Changes optimistically rendered, then persisted.
* Errors revert state if needed.

================================================================

## OPTIONAL FEATURES (FUTURE)

* SQL export
* Image export (PNG/SVG)
* Real-time collaboration
* Undo/redo history
* Diagram versioning
* Comments on tables/columns

================================================================

## IMPORTANT IMPLEMENTATION NOTES

* Keep backend stateless.
* Enforce permissions in policies, not controllers.
* Avoid frequent API calls (use debounce).
* React Flow handles layout, backend persists state.
* Diagram data should load in a single API request.

