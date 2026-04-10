-- CreateEnum: FeatureType
CREATE TYPE "FeatureType" AS ENUM ('BOOLEAN', 'LIMIT', 'CONFIG');

-- CreateEnum: ConfigType
CREATE TYPE "ConfigType" AS ENUM ('INTEGER', 'ENUM');

-- CreateEnum: TierMode
CREATE TYPE "TierMode" AS ENUM ('GRADUATED', 'VOLUME');

-- AlterTable: Feature — add type, unitLabel, configType, configOptions
ALTER TABLE "Feature" ADD COLUMN "type" "FeatureType" NOT NULL DEFAULT 'BOOLEAN';
ALTER TABLE "Feature" ADD COLUMN "unitLabel" TEXT;
ALTER TABLE "Feature" ADD COLUMN "configType" "ConfigType";
ALTER TABLE "Feature" ADD COLUMN "configOptions" JSONB;

-- AlterTable: PlanFeature — add new columns, drop enabled
ALTER TABLE "PlanFeature" ADD COLUMN "includedAmount" INTEGER;
ALTER TABLE "PlanFeature" ADD COLUMN "softLimit" INTEGER;
ALTER TABLE "PlanFeature" ADD COLUMN "hardLimit" INTEGER;
ALTER TABLE "PlanFeature" ADD COLUMN "limitPeriod" "QuotaPeriod";
ALTER TABLE "PlanFeature" ADD COLUMN "tierMode" "TierMode";
ALTER TABLE "PlanFeature" ADD COLUMN "configValue" TEXT;

-- Data migration: PlanQuota → Feature (LIMIT) + PlanFeature
INSERT INTO "Feature" ("id", "tenantId", "key", "name", "type", "active", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  p."tenantId",
  pq."key",
  pq."name",
  'LIMIT'::"FeatureType",
  true,
  NOW(),
  NOW()
FROM "PlanQuota" pq
JOIN "Plan" p ON p."id" = pq."planId"
ON CONFLICT ("tenantId", "key") DO NOTHING;

INSERT INTO "PlanFeature" ("id", "planId", "featureId", "includedAmount", "hardLimit", "limitPeriod", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  pq."planId",
  f."id",
  pq."limitValue",
  pq."limitValue",
  pq."period",
  NOW(),
  NOW()
FROM "PlanQuota" pq
JOIN "Plan" p ON p."id" = pq."planId"
JOIN "Feature" f ON f."tenantId" = p."tenantId" AND f."key" = pq."key"
ON CONFLICT ("planId", "featureId") DO NOTHING;

-- Drop enabled column from PlanFeature
ALTER TABLE "PlanFeature" DROP COLUMN IF EXISTS "enabled";

-- DropTable: PlanQuota
DROP TABLE "PlanQuota";

-- CreateTable: MeteringTier
CREATE TABLE "MeteringTier" (
    "id" TEXT NOT NULL,
    "planFeatureId" TEXT NOT NULL,
    "fromUnit" INTEGER NOT NULL,
    "toUnit" INTEGER,
    "unitPriceMinor" INTEGER NOT NULL,
    "flatFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeteringTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeteringTier_planFeatureId_fromUnit_key" ON "MeteringTier"("planFeatureId", "fromUnit");
CREATE INDEX "MeteringTier_planFeatureId_idx" ON "MeteringTier"("planFeatureId");

-- AddForeignKey
ALTER TABLE "MeteringTier" ADD CONSTRAINT "MeteringTier_planFeatureId_fkey" FOREIGN KEY ("planFeatureId") REFERENCES "PlanFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
