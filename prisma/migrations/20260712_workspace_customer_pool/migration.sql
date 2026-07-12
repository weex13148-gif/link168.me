-- D1 enterprise customer pool. Existing personal leads are not migrated.
CREATE TABLE "workspace_customers" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "wechat" TEXT,
    "message" TEXT,
    "source_component" TEXT,
    "source_page" TEXT,
    "interested_product_id" UUID,
    "interested_product_name" TEXT,
    "interested_product_price" TEXT,
    "interested_product_category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "handler_note" TEXT,
    "handled_at" TIMESTAMPTZ(6),
    "assigned_to_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_customer_follow_ups" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_customer_follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_customer_tasks" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "due_at" TIMESTAMPTZ(6),
    "assigned_to_user_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "completed_by_user_id" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_customer_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_customer_assignment_history" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "from_user_id" UUID,
    "to_user_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_customer_assignment_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "workspace_customers"
ADD CONSTRAINT "workspace_customers_status_check"
CHECK ("status" IN ('new', 'contacted', 'following', 'converted', 'closed'));

ALTER TABLE "workspace_customer_tasks"
ADD CONSTRAINT "workspace_customer_tasks_status_check"
CHECK ("status" IN ('pending', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE "workspace_customer_tasks"
ADD CONSTRAINT "workspace_customer_tasks_priority_check"
CHECK ("priority" IN ('low', 'normal', 'high', 'urgent'));

CREATE INDEX "workspace_customers_workspace_id_status_created_at_idx"
ON "workspace_customers"("workspace_id", "status", "created_at");
CREATE INDEX "workspace_customers_workspace_id_assigned_to_user_id_status_idx"
ON "workspace_customers"("workspace_id", "assigned_to_user_id", "status");
CREATE INDEX "workspace_customers_workspace_id_email_idx"
ON "workspace_customers"("workspace_id", "email");
CREATE INDEX "workspace_customers_workspace_id_phone_idx"
ON "workspace_customers"("workspace_id", "phone");
CREATE INDEX "workspace_customer_follow_ups_workspace_id_customer_id_created_at_idx"
ON "workspace_customer_follow_ups"("workspace_id", "customer_id", "created_at");
CREATE INDEX "workspace_customer_follow_ups_created_by_user_id_created_at_idx"
ON "workspace_customer_follow_ups"("created_by_user_id", "created_at");
CREATE INDEX "workspace_customer_tasks_workspace_id_assigned_to_user_id_status_idx"
ON "workspace_customer_tasks"("workspace_id", "assigned_to_user_id", "status");
CREATE INDEX "workspace_customer_tasks_workspace_id_customer_id_status_idx"
ON "workspace_customer_tasks"("workspace_id", "customer_id", "status");
CREATE INDEX "workspace_customer_tasks_due_at_status_idx"
ON "workspace_customer_tasks"("due_at", "status");
CREATE INDEX "workspace_customer_assignment_history_workspace_id_customer_id_created_at_idx"
ON "workspace_customer_assignment_history"("workspace_id", "customer_id", "created_at");
CREATE INDEX "workspace_customer_assignment_history_workspace_id_from_user_id_created_at_idx"
ON "workspace_customer_assignment_history"("workspace_id", "from_user_id", "created_at");
CREATE INDEX "workspace_customer_assignment_history_workspace_id_to_user_id_created_at_idx"
ON "workspace_customer_assignment_history"("workspace_id", "to_user_id", "created_at");

ALTER TABLE "workspace_customers"
ADD CONSTRAINT "workspace_customers_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_customers"
ADD CONSTRAINT "workspace_customers_assigned_to_user_id_fkey"
FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_customers"
ADD CONSTRAINT "workspace_customers_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_customers"
ADD CONSTRAINT "workspace_customers_interested_product_id_fkey"
FOREIGN KEY ("interested_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workspace_customer_follow_ups"
ADD CONSTRAINT "workspace_customer_follow_ups_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_follow_ups"
ADD CONSTRAINT "workspace_customer_follow_ups_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "workspace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_follow_ups"
ADD CONSTRAINT "workspace_customer_follow_ups_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_customer_tasks"
ADD CONSTRAINT "workspace_customer_tasks_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_tasks"
ADD CONSTRAINT "workspace_customer_tasks_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "workspace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_tasks"
ADD CONSTRAINT "workspace_customer_tasks_assigned_to_user_id_fkey"
FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_tasks"
ADD CONSTRAINT "workspace_customer_tasks_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_tasks"
ADD CONSTRAINT "workspace_customer_tasks_completed_by_user_id_fkey"
FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workspace_customer_assignment_history"
ADD CONSTRAINT "workspace_customer_assignment_history_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_assignment_history"
ADD CONSTRAINT "workspace_customer_assignment_history_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "workspace_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_assignment_history"
ADD CONSTRAINT "workspace_customer_assignment_history_from_user_id_fkey"
FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_assignment_history"
ADD CONSTRAINT "workspace_customer_assignment_history_to_user_id_fkey"
FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_customer_assignment_history"
ADD CONSTRAINT "workspace_customer_assignment_history_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
