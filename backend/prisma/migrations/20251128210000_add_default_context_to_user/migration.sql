-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_context" VARCHAR(255) DEFAULT 'self';

-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "target_owner_id" TEXT;

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_target_owner_id_fkey'
    ) THEN
        ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_target_owner_id_fkey"
        FOREIGN KEY ("target_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activity_logs_target_owner_id_idx" ON "activity_logs"("target_owner_id");
