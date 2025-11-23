-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT,
ALTER COLUMN "yearsOfExperience" SET DATA TYPE DOUBLE PRECISION;
