-- Scope features to product family

ALTER TABLE "Feature" ADD COLUMN "productFamilyId" TEXT;

UPDATE "Feature" AS f
SET "productFamilyId" = COALESCE(
  (
    SELECT p."productFamilyId"
    FROM "PlanFeature" pf
    INNER JOIN "Plan" p ON p."id" = pf."planId"
    WHERE pf."featureId" = f."id"
    LIMIT 1
  ),
  (
    SELECT pfam."id"
    FROM "ProductFamily" pfam
    WHERE pfam."tenantId" = f."tenantId"
    ORDER BY pfam."sortOrder" ASC, pfam."createdAt" ASC
    LIMIT 1
  )
);

ALTER TABLE "Feature" ALTER COLUMN "productFamilyId" SET NOT NULL;

DROP INDEX IF EXISTS "Feature_tenantId_key_key";

CREATE UNIQUE INDEX "Feature_tenantId_productFamilyId_key_key" ON "Feature"("tenantId", "productFamilyId", "key");

CREATE INDEX "Feature_productFamilyId_idx" ON "Feature"("productFamilyId");

ALTER TABLE "Feature" ADD CONSTRAINT "Feature_productFamilyId_fkey" FOREIGN KEY ("productFamilyId") REFERENCES "ProductFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
