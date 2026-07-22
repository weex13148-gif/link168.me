-- 状态机包含 refund_processing（17 个字符），历史 orders.status 的 VARCHAR(16) 会阻断退款流程。
ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE TEXT;
