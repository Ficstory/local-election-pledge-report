-- CreateTable
CREATE TABLE "CandidateDisclosureAnalysis" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "sourceMaterialId" TEXT,
    "sourceMaterialPath" TEXT,
    "criminalRecordStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "criminalRecordCount" INTEGER,
    "criminalRecordSummary" TEXT,
    "criminalRecordExcerpt" TEXT,
    "criminalOffenses" JSONB,
    "criminalPunishments" JSONB,
    "pageCount" INTEGER,
    "textCharCount" INTEGER,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateDisclosureAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateDisclosureAnalysis_candidateId_key" ON "CandidateDisclosureAnalysis"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateDisclosureAnalysis_criminalRecordStatus_idx" ON "CandidateDisclosureAnalysis"("criminalRecordStatus");

-- CreateIndex
CREATE INDEX "CandidateDisclosureAnalysis_criminalRecordCount_idx" ON "CandidateDisclosureAnalysis"("criminalRecordCount");

-- AddForeignKey
ALTER TABLE "CandidateDisclosureAnalysis" ADD CONSTRAINT "CandidateDisclosureAnalysis_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
