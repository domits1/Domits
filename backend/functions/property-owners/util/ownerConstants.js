export const OWNER_STATUSES = Object.freeze(["active", "inactive", "pending", "archived"]);

export const DEFAULT_OWNER_STATUS = "active";

export const ARCHIVED_OWNER_STATUS = "archived";

export const OWNER_TYPES = Object.freeze(["individual", "company", "trust"]);

export const OWNER_TYPES_REQUIRING_COMPANY_NAME = Object.freeze(["company", "trust"]);

export const OWNER_FIELD_MAX_LENGTHS = Object.freeze({
  first_name: 100,
  last_name: 100,
  company_name: 200,
  email: 254,
  phone: 50,
  preferred_language: 10,
  owner_type: 20,
  status: 20,
  notes: 2000,
});

export const PROPERTY_ID_MAX_LENGTH = 255;
