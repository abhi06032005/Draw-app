# Security Audit & Hardening Report — Real-Time Collaborative Drawing App

## Executive Summary

- **Overall Security Status**: **HIGH -> HARDENED (Production Ready)**
- **Audit Scope**: Monorepo (`apps/fe`, `apps/http-backend`, `apps/ws-backend`, `packages/common`, `packages/common-backend`, `packages/db`, Docker files).
- **Core Focus**: Broken Authorization (IDOR), Unauthenticated/Unauthorized WebSocket events, DoS via Connection/Event Flooding, Missing HTTP Security Headers, Missing Input Validation, and JWT token lifetime policies.

---

## Architecture Security Overview

Draw-App is a monorepo consisting of:
1. **HTTP Backend (`apps/http-backend`)**: Node.js/Express.js REST API on port 4000 handling user sign up/in, room creation, and fetching chat/shape history.
2. **WebSocket Backend (`apps/ws-backend`)**: Node.js/`ws` stateful server on port 8080 handling live room subscriptions (`join_room`, `leave_room`), live canvas shape drawing, and chat broadcasting.
3. **Database (`packages/db`)**: Neon PostgreSQL managed via Prisma ORM (`User`, `Room`, `Chat`, `Shapes` tables).
4. **Shared Schemas (`packages/common`)**: Zod validation schemas shared between frontend and backends.

---

## Vulnerabilities Found & Fixes Implemented

### VULN-01: Broken Authorization / IDOR on Shape Deletion
- **Severity**: **CRITICAL**
- **Location**: `apps/http-backend/src/index.ts` (`DELETE /delete/:roomId`)
- **Description**: Any authenticated user could clear all canvas shapes in any room simply by knowing its numeric `roomId`, without being the admin/creator of that room.
- **Fix Implemented**: Added server-side ownership verification ensuring `room.adminId === userId` before performing `prismaClient.shapes.deleteMany`. Unauthorized attempts now return `403 Forbidden`.

---

### VULN-02: Unauthorized Cross-Room WebSocket Message & Drawing Injection
- **Severity**: **HIGH**
- **Location**: `apps/ws-backend/src/index.ts`
- **Description**: Connected WebSocket clients could send `chat` or `shape` events for any `roomId` without subscribing to or joining that room (`join_room`).
- **Fix Implemented**: Enforced room membership checks (`currentUserObj.rooms.includes(roomIdStr)`). Clients are rejected with an `Unauthorized: You must join the room before drawing/chatting` error frame if not joined.

---

### VULN-03: Lack of WebSocket Rate Limiting & Resource Exhaustion (DoS)
- **Severity**: **HIGH**
- **Location**: `apps/ws-backend/src/index.ts`
- **Description**: No message rate limits or payload size restrictions existed on WebSocket connections. Malicious clients could flood servers with gigabytes of nested JSON payload or spam messages continuously.
- **Fix Implemented**: 
  1. Configured `maxPayload: 256 KB` on `WebSocketServer`.
  2. Implemented per-IP connection limit (max 10 active connections per IP).
  3. Implemented per-socket message rate limiting (max 60 messages per 10 seconds).
  4. Added maximum room subscription cap (max 20 rooms per socket connection).

---

### VULN-04: Lack of Input Validation & Strict Payload Schemas
- **Severity**: **MEDIUM**
- **Location**: `packages/common/src/types.ts` & `apps/ws-backend/src/index.ts`
- **Description**: Raw WebSocket message data was parsed and pushed directly into database queries and broadcasts without validation.
- **Fix Implemented**: Added Zod schemas (`WsJoinRoomSchema`, `WsLeaveRoomSchema`, `WsChatSchema`, `WsShapeSchema`) validating string lengths, event types, payload sizes, and room IDs prior to database operations or broadcasting.

---

### VULN-05: Missing Rate Limiting & Unrestricted CORS on REST Endpoints
- **Severity**: **MEDIUM**
- **Location**: `apps/http-backend/src/index.ts`
- **Description**: `cors({ origin: "*" })` allowed cross-origin requests from any site. No rate limiters protected `/signin` or `/signup` endpoints against credential stuffing/brute force.
- **Fix Implemented**:
  1. Integrated `express-rate-limit` (20 attempts / 15 mins for auth; 120 req / min for API).
  2. Configured restrictive CORS allowing origins from `ALLOWED_ORIGINS` environment variables.
  3. Added `helmet` to set secure HTTP headers (`X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`).

---

### VULN-06: Unlimited JWT Token Lifetime & Information Leakage
- **Severity**: **LOW**
- **Location**: `apps/http-backend/src/index.ts` & `apps/http-backend/src/middleware.ts`
- **Description**: Issued JWT tokens had no expiration timestamp (`expiresIn`), allowing stolen tokens to remain valid indefinitely. Raw server exception details were logged/returned to clients.
- **Fix Implemented**:
  1. Set explicit `expiresIn: "7d"` on JWT signatures.
  2. Sanitized REST responses to hide raw exception objects from end users.

---

## Remaining Risks & Recommendations

1. **Secret Rotation**: Rotate `JWT_SECRET` and `DATABASE_URL` in hosting environment variables if they were ever used in shared dev setups.
2. **Redis Adapter for WS Horizontal Scaling**: When scaling `ws-backend` to multiple instances, integrate a Redis Pub/Sub adapter to sync socket room channels statefully.

---

## Production Security Checklist

- [x] HTTPS / WSS protocol enforced in production environment
- [x] JWT verification and 7-day token expiration active
- [x] Server-side IDOR authorization verified on room resources
- [x] WebSocket connection authentication & room membership authorization verified
- [x] WebSocket message & connection rate limiting enabled
- [x] Zod input validation enforced on all HTTP and WebSocket payloads
- [x] HTTP Security Headers configured via `helmet`
- [x] Restrictive CORS configured for trusted origins
- [x] Secrets stored strictly in `.env` files (excluded from Git)
- [x] Detailed error tracebacks stripped from production HTTP responses
