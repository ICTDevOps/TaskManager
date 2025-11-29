-- CreateTable
CREATE TABLE "task_delegations" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "delegate_id" TEXT NOT NULL,
    "can_create_tasks" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_tasks" BOOLEAN NOT NULL DEFAULT false,
    "can_delete_tasks" BOOLEAN NOT NULL DEFAULT false,
    "can_create_categories" BOOLEAN NOT NULL DEFAULT false,
    "hidden_category_ids" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_title" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_delegations_owner_id_idx" ON "task_delegations"("owner_id");

-- CreateIndex
CREATE INDEX "task_delegations_delegate_id_idx" ON "task_delegations"("delegate_id");

-- CreateIndex
CREATE INDEX "task_delegations_status_idx" ON "task_delegations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "task_delegations_owner_id_delegate_id_key" ON "task_delegations"("owner_id", "delegate_id");

-- CreateIndex
CREATE INDEX "activity_logs_owner_id_idx" ON "activity_logs"("owner_id");

-- CreateIndex
CREATE INDEX "activity_logs_actor_id_idx" ON "activity_logs"("actor_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "activity_logs_owner_id_created_at_idx" ON "activity_logs"("owner_id", "created_at");

-- AddForeignKey
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_delegate_id_fkey" FOREIGN KEY ("delegate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
