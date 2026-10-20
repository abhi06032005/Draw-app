CREATE TABLE IF NOT EXISTS "public"."GithubConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'github',
  "githubLogin" TEXT,
  "encryptedToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GithubConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."ArchitectureGraph" (
  "id" TEXT NOT NULL,
  "roomId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "repositoryFullName" TEXT NOT NULL,
  "repositoryUrl" TEXT NOT NULL,
  "commitSha" TEXT NOT NULL,
  "branch" TEXT NOT NULL,
  "depth" TEXT NOT NULL,
  "graph" JSONB NOT NULL,
  "sourceCount" INTEGER NOT NULL DEFAULT 0,
  "nodeCount" INTEGER NOT NULL DEFAULT 0,
  "edgeCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArchitectureGraph_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."AnalysisJob" (
  "id" TEXT NOT NULL,
  "roomId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "architectureGraphId" TEXT,
  "repositoryFullName" TEXT NOT NULL,
  "repositoryUrl" TEXT NOT NULL,
  "branch" TEXT NOT NULL,
  "depth" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "stage" TEXT NOT NULL DEFAULT 'queued',
  "error" TEXT,
  "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GithubConnection_userId_provider_key" ON "public"."GithubConnection"("userId", "provider");
CREATE UNIQUE INDEX IF NOT EXISTS "ArchitectureGraph_roomId_repositoryFullName_commitSha_key" ON "public"."ArchitectureGraph"("roomId", "repositoryFullName", "commitSha");
CREATE INDEX IF NOT EXISTS "ArchitectureGraph_repositoryFullName_commitSha_idx" ON "public"."ArchitectureGraph"("repositoryFullName", "commitSha");
CREATE INDEX IF NOT EXISTS "AnalysisJob_roomId_createdAt_idx" ON "public"."AnalysisJob"("roomId", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalysisJob_repositoryFullName_status_idx" ON "public"."AnalysisJob"("repositoryFullName", "status");

ALTER TABLE "public"."GithubConnection" ADD CONSTRAINT "GithubConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ArchitectureGraph" ADD CONSTRAINT "ArchitectureGraph_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ArchitectureGraph" ADD CONSTRAINT "ArchitectureGraph_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AnalysisJob" ADD CONSTRAINT "AnalysisJob_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AnalysisJob" ADD CONSTRAINT "AnalysisJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AnalysisJob" ADD CONSTRAINT "AnalysisJob_architectureGraphId_fkey" FOREIGN KEY ("architectureGraphId") REFERENCES "public"."ArchitectureGraph"("id") ON DELETE SET NULL ON UPDATE CASCADE;
