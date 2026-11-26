CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_created_idx_test
ON test.booking (hostid, property_id, createdat, id);

CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_stay_idx_test
ON test.booking (hostid, property_id, arrivaldate) INCLUDE (departuredate);

CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_created_idx
ON main.booking (hostid, property_id, createdat, id);

CREATE INDEX ASYNC IF NOT EXISTS booking_owner_financial_stay_idx
ON main.booking (hostid, property_id, arrivaldate) INCLUDE (departuredate);
