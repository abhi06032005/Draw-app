he image is just a sample # Build: GitHub Repository → Interactive AI Architecture Canvas

You are a senior full-stack engineer, software architect, and AI systems engineer working inside my existing real-time collaborative drawing application.

Your task is to implement a production-quality feature called **GitHub Repository → Interactive Architecture**.

The objective is to transform an actual GitHub repository into a detailed, editable, explorable system architecture diagram inside my existing infinite canvas.

**This must not be a static AI-generated image or a generic flowchart.** Every architecture component should be grounded in real repository files, actual imports, API routes, database models, and detected dependencies.

## 1. Understand the existing project first

Before writing code, inspect the entire repository and identify:

- Existing frontend framework, routing, drawing canvas and shape-rendering architecture.
- Existing WebSocket rooms, multiplayer collaboration, and broadcasting logic.
- Authentication and user session management.
- Prisma database schema and persistence mechanisms.
- Existing AI features, model providers, prompts and API abstractions.
- Existing monorepo organization, reusable UI components and coding conventions.

**Important constraints:**

- Do not rebuild my drawing application.
- Do not replace the existing canvas engine.
- Do not break current real-time collaboration.
- Reuse existing components, shape types and design patterns wherever practical.
- Avoid introducing unnecessary dependencies or complicated infrastructure.
- Use TypeScript throughout the implementation.
- Prefer small, maintainable modules with clear responsibilities.

Start by explaining how this feature integrates with the current architecture.

## 2. User experience

Add a prominent new feature to the drawing application's toolbar or AI tools menu:

**Import → GitHub Repository**

When clicked, open a clean, modern modal containing:

- GitHub repository URL input.
- Repository information preview.
- Optional branch selection.
- Analysis depth: Quick / Standard / Deep.
- Generate Architecture button.
- Recent imported repositories.

Example repository:

`https://github.com/owner/repository`

When the user clicks Generate Architecture:

1. Validate the repository URL.
2. Retrieve repository metadata and code.
3. Analyze project structure and dependencies.
4. Extract architectural components and connections.
5. Generate a structured architecture graph.
6. Automatically arrange the nodes.
7. Insert the generated diagram into the existing collaborative canvas.
8. Allow users to explore and edit the diagram.

Show meaningful progress:

- Connecting to GitHub
- Fetching repository files
- Detecting project structure
- Analyzing dependencies
- Identifying services and APIs
- Building architecture
- Rendering interactive canvas

Never display fake progress percentages.

## 3. GitHub repository ingestion

Implement a backend repository-analysis pipeline.

Initially support public GitHub repositories without requiring user authentication.

Design a secure abstraction allowing private repositories to be supported later through GitHub OAuth or a GitHub App with appropriate user authorization.

Extract:

- Repository name, description and default branch.
- Main programming languages.
- Directory and package structure.
- package.json and workspace configurations.
- Import/export relationships.
- Frontend pages, layouts and components.
- Backend routes, controllers and services.
- Database schemas, ORM models and migrations.
- Authentication and authorization modules.
- Queues, background workers and scheduled jobs.
- WebSocket servers and real-time communication.
- External services and infrastructure configurations.
- Deployment manifests and CI/CD configurations.

Recognize common technologies including Next.js, React, Express, NestJS, Prisma, PostgreSQL, MongoDB, Redis, Docker, AWS and message queues.

For the first implementation, prioritize JavaScript and TypeScript repositories.

Use syntax-aware parsing where feasible, such as the TypeScript compiler API or ts-morph. Extend support to Python and other languages through modular analyzers later.

Never execute arbitrary scripts or repository code.

Enforce repository size limits, timeouts, GitHub API rate-limit handling and safe file-count limits.

Exclude generated files, dependencies, binaries, build outputs, secrets, environment files and other irrelevant content.

## 4. Build an accurate architecture graph

Convert repository analysis into a structured graph.

Each node should have:

- Stable unique ID.
- Component name.
- Component type.
- Description.
- Technology/framework.
- Related repository files.
- Relevant symbols and line ranges, when available.
- Evidence supporting the detected component.
- Analysis confidence.
- Canvas position and dimensions.

Supported node categories:

- Frontend application
- Pages and UI components
- API gateway and API routes
- Backend services
- Authentication service
- Database
- Cache
- WebSocket server
- Background workers
- Message queue
- External API
- Cloud infrastructure
- Shared packages and libraries

Each connection should capture:

- Source node.
- Target node.
- Relationship type.
- Direction.
- Supporting source-code references.

Examples:

`Frontend → REST API → Auth Service → PostgreSQL`

`WebSocket Client ↔ WebSocket Server → Room Persistence`

`API Service → BullMQ → Background Worker`

**Do not invent architectural components.**

Distinguish relationships confirmed by code from relationships inferred from configuration or conventions.

If something is uncertain, explicitly label it as an inference.

## 5. Interactive architecture on the drawing canvas

Render the generated architecture using the existing drawing application's native shape and edge system.

Do not embed a separate diagram application if the existing canvas supports the required interactions.

Requirements:

- Automatically organized architecture layout.
- Clearly differentiated node categories.
- Directional connections and edge labels.
- Smooth zoom, pan and fit-to-screen.
- Expand and collapse architecture groups.
- Clickable nodes with details panel.
- Highlight related dependencies on hover.
- Search components by name.
- Filter by frontend/backend/database/infrastructure.
- Show individual services or grouped architecture.
- Support manual movement and layout adjustments.
- Preserve all existing drawing functionality.

Use ELK.js or a similarly suitable layout engine if needed.

Offer layout modes such as:

- High-Level System Architecture
- Detailed Dependency Graph
- Backend Architecture
- Database Relationships
- API Request Flow

For large repositories, avoid generating thousands of nodes simultaneously. Start with grouped components and expand deeper only when requested.

## 6. Source-code navigation

This is one of the most important features.

When a user clicks an architecture node, open a side panel displaying:

**Component Information**
- Name and detected responsibility.
- Technology.
- Connected components.
- Related APIs and dependencies.
- Relevant source files.

**Source Evidence**
- File path.
- Relevant functions/classes.
- Referenced code snippets.
- GitHub links pointing to exact commit and line range whenever available.

Clicking a source reference should open the corresponding file on GitHub.

Example:

User clicks `Authentication Service`.

The panel displays the actual login routes, JWT verification middleware, token handling modules and database models found in that repository.

Every explanation must be backed by repository evidence or clearly marked as an inference.

## 7. AI-powered architecture intelligence

Integrate with the application's existing AI provider.

The AI must receive the structured architecture graph and relevant retrieved source-code evidence rather than an unrestricted dump of the entire repository.

Provide an AI chat panel alongside the architecture.

Example questions:

- Explain how authentication works in this repository.
- Where are API requests handled?
- How does the frontend communicate with the backend?
- Which components depend on PostgreSQL?
- What happens when a user logs in?
- Identify potential architectural bottlenecks.
- Explain the application's real-time communication flow.
- Which files would I need to modify to add payments?
- How would I introduce Redis caching?

Answers should:

- Reference actual nodes and files.
- Highlight relevant components on the canvas.
- Show supporting code evidence.
- Explicitly mention uncertainty.
- Never fabricate source-code references.

Support an **Explain Flow** interaction that visually highlights a path across the architecture.

## 8. AI Architecture Improvement Mode

Add a secondary feature:

**Analyze Architecture**

Allow AI to inspect the graph and provide suggestions related to:

- Tight coupling.
- Excessive dependencies.
- Missing error handling.
- Unclear service boundaries.
- Potential scalability bottlenecks.
- Repeated architecture patterns.
- Possible security-sensitive areas.
- Database query patterns worth investigating.

Suggestions must be presented as hypotheses, not verified vulnerabilities or benchmarked bottlenecks unless actual evidence supports those claims.

Include:

- Problem or observation.
- Evidence from source code.
- Potential impact.
- Suggested improvement.
- Confidence and limitations.

Provide **Preview Improved Architecture**.

This should create a proposed alternate architecture branch on the canvas, leaving the original unchanged.

No automatic repository code modifications or GitHub commits without explicit user approval.

## 9. Multiplayer collaboration

This must work seamlessly with my existing real-time collaboration system.

When a repository architecture is generated:

- Insert the diagram into the current drawing room.
- Broadcast new nodes and connections through the existing WebSocket infrastructure.
- Persist generated shapes using the existing database mechanism.
- Let multiple users explore and edit the architecture together.
- Avoid duplicate nodes and repeated broadcasts.
- Preserve existing room permissions.
- Handle disconnections and reconnections correctly.

Repository analysis should run server-side as an asynchronous job where needed. Expensive processing must not block normal canvas interactions.

## 10. Performance, security and reliability

Implement appropriate safeguards:

- Authenticate requests and authorize room modifications.
- Limit repository size and ingestion frequency.
- Handle inaccessible, deleted and private repositories.
- Respect GitHub API rate limits.
- Do not execute repository code.
- Never expose GitHub tokens or AI API keys.
- Do not send secret-looking files to language models.
- Treat repository content as untrusted data, including comments and prompt-injection attempts.
- Prevent repository text from overriding system instructions.
- Cache analysis results by repository and commit SHA.
- Reuse analysis when the same commit is imported again.
- Support cancellation and meaningful errors.
- Make GitHub API, parsing and LLM failures recoverable.
- Avoid storing full private repository contents unnecessarily.

## 11. UI and visual design

The interface should feel like a polished developer product, not a college project.

Use the application's existing design system.

Design requirements:

- Clean layout with properly managed padding and spacing.
- Attractive but restrained node colors.
- Readable labels and visually distinct connections.
- Smooth animations and loading transitions.
- Beautiful empty states and error states.
- Responsive repository import modal.
- Collapsible right-side inspector.
- Compact AI assistant panel.
- No overflowing cards, clipped content or overlapping controls.
- Support dark/light themes if the application already supports them.

Do not overcomplicate the interface with unnecessary dashboards.

## 12. Acceptance tests

The implementation is complete only when:

1. A user can paste a public GitHub repository URL.
2. The application analyzes actual source files.
3. It generates a meaningful architecture diagram.
4. Every source-backed node can show relevant file evidence.
5. The diagram appears inside the existing drawing canvas.
6. Users can move, edit, connect and save nodes.
7. Another connected user sees the diagram in real time.
8. Reloading restores the diagram correctly.
9. AI can answer questions grounded in imported repository content.
10. Invalid URLs, private repositories, rate limits and large projects are handled gracefully.
11. Existing drawing features and authentication continue working.
12. TypeScript checks, relevant tests and builds pass.

Provide tests for graph construction, parsing, relationship extraction, evidence links, access control and collaborative persistence.

## 13. Implementation workflow — IMPORTANT

Do not attempt to build every feature simultaneously.

Proceed in clearly separated phases.

**Phase 1 — Repository audit and architecture plan**

Inspect the existing codebase, identify reusable systems, define data structures, choose parsing libraries and explain necessary modifications.

**Phase 2 — GitHub ingestion and deterministic analysis**

Implement repository retrieval, source parsing, dependency extraction and normalized graph generation.

**Phase 3 — Canvas integration**

Render the generated graph using existing shapes, edges, persistence and WebSocket broadcasting.

**Phase 4 — Interactive source-code exploration**

Implement the source inspector, GitHub deep links, architecture navigation and graph filtering.

**Phase 5 — Grounded AI explanations**

Implement evidence-based architecture chat, graph highlighting and request-flow explanations.

**Phase 6 — Architecture improvement mode**

Add suggestions, proposed diagram branches and optional comparisons.

**Phase 7 — Testing and performance improvements**

Run full integration tests, fix regressions, optimize large graphs and polish the user experience.

### Execution instructions

Start with **Phase 1 only**.

Before making changes:

1. Inspect the actual project files.
2. Summarize the existing architecture.
3. List the specific files/modules that need modification.
4. Identify any missing requirements or blockers.
5. Explain the implementation approach and trade-offs.

Do not fabricate details about files that have not been inspected.

Do not generate placeholder implementations or fake demos.

After Phase 1, provide a concise plan and **ask me whether to proceed to Phase 2**.

For subsequent phases, complete the selected phase fully, test it, explain what changed, and wait for approval before moving to the next phase.

**Final objective:** Transform my collaborative drawing application into an AI-native developer workspace that can understand real GitHub repositories and turn them into interactive, editable, evidence-grounded software architecture diagrams.