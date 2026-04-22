CREATE TABLE IF NOT EXISTS main.channex_sync_evidence (
  "id" VARCHAR(255) NOT NULL,
  "channel" VARCHAR(50) NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "integrationAccountId" VARCHAR(255),
  "domitsPropertyId" VARCHAR(255),
  "syncType" VARCHAR(50) NOT NULL,
  "dateFrom" VARCHAR(10),
  "dateTo" VARCHAR(10),
  "startedAt" BIGINT NOT NULL,
  "finishedAt" BIGINT,
  "status" VARCHAR(50) NOT NULL,
  "overallSuccess" BOOLEAN NOT NULL DEFAULT FALSE,
  "mappingSnapshot" TEXT,
  "groupedOutboundPayloadSnapshot" TEXT,
  "providerResponseSummary" TEXT,
  "taskIds" TEXT,
  "warnings" TEXT,
  "errors" TEXT,
  "notes" TEXT,
  "rawDetails" TEXT,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS idx_channex_sync_evidence_integration_account
  ON main.channex_sync_evidence ("integrationAccountId", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_channex_sync_evidence_domits_property
  ON main.channex_sync_evidence ("domitsPropertyId", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_channex_sync_evidence_sync_type
  ON main.channex_sync_evidence ("syncType", "startedAt" DESC);
