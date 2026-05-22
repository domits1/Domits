export const up = `
  CREATE TABLE IF NOT EXISTS main.pricelabs_connection (
    id                        UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id                   VARCHAR(255)  NOT NULL,
    pricelabs_email           VARCHAR(255)  NOT NULL,
    is_active                 BOOLEAN       NOT NULL DEFAULT true,
    connected_at              BIGINT        NOT NULL,
    last_listings_sync_at     BIGINT,
    last_calendar_sync_at     BIGINT,
    last_reservations_sync_at BIGINT,
    last_sync_status          VARCHAR(64),
    last_sync_error           TEXT,
    CONSTRAINT uq_pricelabs_host UNIQUE (host_id)
  );

  CREATE INDEX IF NOT EXISTS idx_pricelabs_connection_host_id
    ON main.pricelabs_connection (host_id);
`;

export const down = `
  DROP TABLE IF EXISTS main.pricelabs_connection;
`;
