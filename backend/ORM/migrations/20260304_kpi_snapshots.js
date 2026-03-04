export class Migration20260304_kpi_snapshots {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.kpi_snapshot (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        user_id VARCHAR(255) NOT NULL,
        host_id VARCHAR(255),

        period_type VARCHAR(20) NOT NULL, -- weekly | monthly | custom
        period_start TIMESTAMP,
        period_end TIMESTAMP,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),

        revenue NUMERIC,
        booked_nights INTEGER,
        available_nights INTEGER,
        property_count INTEGER,
        alos NUMERIC,
        adr NUMERIC,
        occupancy_rate NUMERIC,
        revpar NUMERIC
      );

      CREATE INDEX IF NOT EXISTS idx_kpi_snapshot_user_id ON main.kpi_snapshot (user_id);
      CREATE INDEX IF NOT EXISTS idx_kpi_snapshot_created_at ON main.kpi_snapshot (created_at);
      CREATE INDEX IF NOT EXISTS idx_kpi_snapshot_period ON main.kpi_snapshot (period_type, period_start, period_end);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE IF EXISTS main.kpi_snapshot;
    `);
  }
}