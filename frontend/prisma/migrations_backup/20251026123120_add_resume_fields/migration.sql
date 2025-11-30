-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resumeData" BYTEA,
ADD COLUMN     "resumeFileName" TEXT,
ADD COLUMN     "resumeMimeType" TEXT,
ADD COLUMN     "resumeUploadedAt" TIMESTAMP(3);
