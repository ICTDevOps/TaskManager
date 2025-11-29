-- Add canCreateApiTokens field to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_create_api_tokens" BOOLEAN NOT NULL DEFAULT false;

-- Create api_tokens table
CREATE TABLE IF NOT EXISTS "api_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "can_read_tasks" BOOLEAN NOT NULL DEFAULT true,
    "can_create_tasks" BOOLEAN NOT NULL DEFAULT false,
    "can_update_tasks" BOOLEAN NOT NULL DEFAULT false,
    "can_delete_tasks" BOOLEAN NOT NULL DEFAULT false,
    "can_read_categories" BOOLEAN NOT NULL DEFAULT true,
    "can_create_categories" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMP(3),
    "last_used_ip" TEXT,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token_hash
CREATE UNIQUE INDEX IF NOT EXISTS "api_tokens_token_hash_key" ON "api_tokens"("token_hash");

-- Create indexes
CREATE INDEX IF NOT EXISTS "api_tokens_user_id_idx" ON "api_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "api_tokens_token_hash_idx" ON "api_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "api_tokens_is_active_idx" ON "api_tokens"("is_active");

-- Add foreign key constraint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
