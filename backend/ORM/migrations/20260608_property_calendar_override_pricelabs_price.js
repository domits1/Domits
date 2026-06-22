export const up = `
  ALTER TABLE main.property_calendar_override
    ADD COLUMN IF NOT EXISTS pricelabs_price INT;
`;

export const down = `
  ALTER TABLE main.property_calendar_override
    DROP COLUMN IF EXISTS pricelabs_price;
`;
