-- CreateIndex for Room queries by admin and ordering by update time
CREATE INDEX IF NOT EXISTS "Room_adminId_updatedAt_idx" ON "public"."Room"("adminId", "updatedAt" DESC);

-- CreateIndex for global Room sorting by update time
CREATE INDEX IF NOT EXISTS "Room_updatedAt_idx" ON "public"."Room"("updatedAt" DESC);

-- CreateIndex for BoardMember lookups by user
CREATE INDEX IF NOT EXISTS "BoardMember_userId_idx" ON "public"."BoardMember"("userId");
