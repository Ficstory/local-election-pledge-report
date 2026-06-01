-- CreateTable
CREATE TABLE "Election" (
    "id" VARCHAR(8) NOT NULL,
    "name" TEXT NOT NULL,
    "voteDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionType" (
    "id" TEXT NOT NULL,
    "electionId" VARCHAR(8) NOT NULL,
    "sgTypecode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "electionId" VARCHAR(8) NOT NULL,
    "electionTypeId" TEXT NOT NULL,
    "regionId" TEXT,
    "districtId" TEXT,
    "partyId" TEXT,
    "rawApiResponseId" TEXT,
    "candidateApiId" TEXT,
    "name" TEXT NOT NULL,
    "ballotNumber" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "job" TEXT,
    "education" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pledge" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "rawApiResponseId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT,
    "priority" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FetchRun" (
    "id" TEXT NOT NULL,
    "electionId" VARCHAR(8),
    "source" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "electionTypeCode" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "rowCount" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "FetchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawApiResponse" (
    "id" TEXT NOT NULL,
    "fetchRunId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "requestMeta" JSONB NOT NULL,
    "responseBody" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawApiResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMaterial" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "storagePath" TEXT,
    "sha256" TEXT,
    "pageCount" INTEGER,
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialDesignAnalysis" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "dominantColors" JSONB,
    "fontNotes" TEXT,
    "layoutNotes" TEXT,
    "imageRatio" DOUBLE PRECISION,
    "textDensity" DOUBLE PRECISION,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialDesignAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionResult" (
    "id" TEXT NOT NULL,
    "electionId" VARCHAR(8) NOT NULL,
    "candidateId" TEXT NOT NULL,
    "sourceRawApiResponseId" TEXT,
    "voteCount" INTEGER,
    "voteRate" DECIMAL(6,3),
    "rank" INTEGER,
    "elected" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ElectionType_sgTypecode_idx" ON "ElectionType"("sgTypecode");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionType_electionId_sgTypecode_key" ON "ElectionType"("electionId", "sgTypecode");

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE INDEX "District_code_idx" ON "District"("code");

-- CreateIndex
CREATE UNIQUE INDEX "District_regionId_name_key" ON "District"("regionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Party_name_key" ON "Party"("name");

-- CreateIndex
CREATE INDEX "Candidate_name_idx" ON "Candidate"("name");

-- CreateIndex
CREATE INDEX "Candidate_electionId_electionTypeId_idx" ON "Candidate"("electionId", "electionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_electionId_electionTypeId_candidateApiId_key" ON "Candidate"("electionId", "electionTypeId", "candidateApiId");

-- CreateIndex
CREATE INDEX "Pledge_candidateId_idx" ON "Pledge"("candidateId");

-- CreateIndex
CREATE INDEX "FetchRun_source_endpoint_idx" ON "FetchRun"("source", "endpoint");

-- CreateIndex
CREATE INDEX "FetchRun_status_idx" ON "FetchRun"("status");

-- CreateIndex
CREATE INDEX "RawApiResponse_source_endpoint_idx" ON "RawApiResponse"("source", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "RawApiResponse_fetchRunId_requestHash_key" ON "RawApiResponse"("fetchRunId", "requestHash");

-- CreateIndex
CREATE INDEX "CampaignMaterial_candidateId_idx" ON "CampaignMaterial"("candidateId");

-- CreateIndex
CREATE INDEX "CampaignMaterial_sha256_idx" ON "CampaignMaterial"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialDesignAnalysis_materialId_key" ON "MaterialDesignAnalysis"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionResult_candidateId_key" ON "ElectionResult"("candidateId");

-- CreateIndex
CREATE INDEX "ElectionResult_electionId_idx" ON "ElectionResult"("electionId");

-- AddForeignKey
ALTER TABLE "ElectionType" ADD CONSTRAINT "ElectionType_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionTypeId_fkey" FOREIGN KEY ("electionTypeId") REFERENCES "ElectionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_rawApiResponseId_fkey" FOREIGN KEY ("rawApiResponseId") REFERENCES "RawApiResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pledge" ADD CONSTRAINT "Pledge_rawApiResponseId_fkey" FOREIGN KEY ("rawApiResponseId") REFERENCES "RawApiResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FetchRun" ADD CONSTRAINT "FetchRun_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawApiResponse" ADD CONSTRAINT "RawApiResponse_fetchRunId_fkey" FOREIGN KEY ("fetchRunId") REFERENCES "FetchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMaterial" ADD CONSTRAINT "CampaignMaterial_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialDesignAnalysis" ADD CONSTRAINT "MaterialDesignAnalysis_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "CampaignMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionResult" ADD CONSTRAINT "ElectionResult_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionResult" ADD CONSTRAINT "ElectionResult_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionResult" ADD CONSTRAINT "ElectionResult_sourceRawApiResponseId_fkey" FOREIGN KEY ("sourceRawApiResponseId") REFERENCES "RawApiResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
