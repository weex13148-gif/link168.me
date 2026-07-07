-- AlterTable: 为 Profile 添加联系方式字段
ALTER TABLE "profiles" ADD COLUMN "company" TEXT;
ALTER TABLE "profiles" ADD COLUMN "job_title" TEXT;
ALTER TABLE "profiles" ADD COLUMN "phone" TEXT;
ALTER TABLE "profiles" ADD COLUMN "email" TEXT;
ALTER TABLE "profiles" ADD COLUMN "wechat" TEXT;
ALTER TABLE "profiles" ADD COLUMN "city" TEXT;
ALTER TABLE "profiles" ADD COLUMN "address" TEXT;
ALTER TABLE "profiles" ADD COLUMN "website" TEXT;
ALTER TABLE "profiles" ADD COLUMN "social_links" JSONB;
ALTER TABLE "profiles" ADD COLUMN "contact_visibility" TEXT NOT NULL DEFAULT 'public';
