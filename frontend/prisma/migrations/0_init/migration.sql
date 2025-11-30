-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "resumeFileName" TEXT,
    "resumeData" BYTEA,
    "resumeMimeType" TEXT,
    "resumeUploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coldEmailData" BYTEA,
    "coldEmailFileName" TEXT,
    "coldEmailMimeType" TEXT,
    "coldEmailUploadedAt" TIMESTAMP(3),
    "coverLetterData" BYTEA,
    "coverLetterFileName" TEXT,
    "coverLetterMimeType" TEXT,
    "coverLetterUploadedAt" TIMESTAMP(3),
    "credits" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "country" TEXT,
    "location" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "githubUrl" TEXT,
    "currentJobTitle" TEXT,
    "yearsOfExperience" DOUBLE PRECISION,
    "professionalSummary" TEXT,
    "highestDegree" TEXT,
    "fieldOfStudy" TEXT,
    "university" TEXT,
    "graduationYear" INTEGER,
    "workExperience" TEXT,
    "technicalSkills" TEXT,
    "softSkills" TEXT,
    "certifications" TEXT,
    "keyAchievements" TEXT,
    "notableProjects" TEXT,
    "targetRoles" TEXT,
    "industriesOfInterest" TEXT,
    "workPreference" TEXT,
    "currency" TEXT,
    "salaryExpectation" TEXT,
    "languagesSpoken" TEXT,
    "availability" TEXT,
    "noticePeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generations" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "job_description" TEXT NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "hr_name" VARCHAR(255),
    "custom_prompt" TEXT,
    "cover_letter" TEXT NOT NULL,
    "cold_email" TEXT NOT NULL,
    "job_requirements" JSONB,
    "company_research" JSONB,
    "user_qualifications" JSONB,
    "writing_style" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "idx_generations_created_at" ON "generations"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_generations_user_id" ON "generations"("user_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

