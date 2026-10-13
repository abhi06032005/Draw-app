-- AlterTable: Add missing columns to Room
ALTER TABLE "public"."Room" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "public"."Room" ADD COLUMN IF NOT EXISTS "elements" JSONB;
ALTER TABLE "public"."Room" ADD COLUMN IF NOT EXISTS "appState" JSONB;
ALTER TABLE "public"."Room" ADD COLUMN IF NOT EXISTS "files" JSONB;
ALTER TABLE "public"."Room" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: BoardMember
CREATE TABLE IF NOT EXISTS "public"."BoardMember" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',

    CONSTRAINT "BoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FileAsset
CREATE TABLE IF NOT EXISTS "public"."FileAsset" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BoardMember_roomId_userId_key" ON "public"."BoardMember"("roomId", "userId");

-- AddForeignKey: BoardMember roomId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BoardMember_roomId_fkey'
    ) THEN
        ALTER TABLE "public"."BoardMember" ADD CONSTRAINT "BoardMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: BoardMember userId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BoardMember_userId_fkey'
    ) THEN
        ALTER TABLE "public"."BoardMember" ADD CONSTRAINT "BoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Update Chat foreign key to CASCADE on delete if needed
DO $$
BEGIN
    ALTER TABLE "public"."Chat" DROP CONSTRAINT IF EXISTS "Chat_roomId_fkey";
    ALTER TABLE "public"."Chat" ADD CONSTRAINT "Chat_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
