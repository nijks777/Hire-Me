-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "location" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "githubUrl" TEXT,
    "currentJobTitle" TEXT,
    "yearsOfExperience" INTEGER,
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
    "salaryExpectation" TEXT,
    "languagesSpoken" TEXT,
    "availability" TEXT,
    "noticePeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
