export class Invoices20260526 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS main.invoice (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        host_id VARCHAR(255) NOT NULL,
        booking_id VARCHAR(255) NOT NULL,
        property_id VARCHAR(255) NOT NULL,
        property_name VARCHAR(255) NOT NULL,
        guest_name VARCHAR(255) NOT NULL,
        arrival_date BIGINT NOT NULL,
        departure_date BIGINT NOT NULL,
        nights INTEGER NOT NULL,
        rate_per_night NUMERIC(10, 2) NOT NULL,
        gross_amount NUMERIC(10, 2) NOT NULL,
        commission_amount NUMERIC(10, 2) NOT NULL,
        net_amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'finalized',
        created_at BIGINT NOT NULL
      );

      CREATE INDEX ASYNC idx_invoice_host_id ON main.invoice (host_id);
      CREATE INDEX ASYNC idx_invoice_booking_id ON main.invoice (booking_id);
      CREATE INDEX ASYNC idx_invoice_created_at ON main.invoice (created_at);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE IF EXISTS main.invoice;
    `);
  }
}
