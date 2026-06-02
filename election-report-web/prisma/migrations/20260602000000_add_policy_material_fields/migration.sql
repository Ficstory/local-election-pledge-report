-- AlterTable
ALTER TABLE "CampaignMaterial" ADD COLUMN "sourceSystem" TEXT NOT NULL DEFAULT 'POLICY_NEC';
ALTER TABLE "CampaignMaterial" ADD COLUMN "sourceMaterialId" TEXT;
ALTER TABLE "CampaignMaterial" ADD COLUMN "sourceFilePath" TEXT;
ALTER TABLE "CampaignMaterial" ADD COLUMN "title" TEXT;
ALTER TABLE "CampaignMaterial" ADD COLUMN "fileName" TEXT;
ALTER TABLE "CampaignMaterial" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "CampaignMaterial" ADD COLUMN "fileSizeBytes" INTEGER;
ALTER TABLE "CampaignMaterial" ADD COLUMN "downloadStatus" TEXT NOT NULL DEFAULT 'METADATA_ONLY';
ALTER TABLE "CampaignMaterial" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "CampaignMaterial" ADD COLUMN "metadataCollectedAt" TIMESTAMP(3);

-- Backfill stable ids for any legacy rows before enforcing NOT NULL.
UPDATE "CampaignMaterial"
SET "sourceMaterialId" = CONCAT('LEGACY:', "id")
WHERE "sourceMaterialId" IS NULL;

ALTER TABLE "CampaignMaterial" ALTER COLUMN "sourceMaterialId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "CampaignMaterial_materialType_idx" ON "CampaignMaterial"("materialType");
CREATE INDEX "CampaignMaterial_downloadStatus_idx" ON "CampaignMaterial"("downloadStatus");
CREATE INDEX "CampaignMaterial_sourceMaterialId_idx" ON "CampaignMaterial"("sourceMaterialId");
CREATE UNIQUE INDEX "CampaignMaterial_sourceSystem_sourceMaterialId_key" ON "CampaignMaterial"("sourceSystem", "sourceMaterialId");
