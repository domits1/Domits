const IDENTITY_TRANSFORMER = Object.freeze({
  from: Number,
  to: (value) => value,
});

const NULLABLE_BIGINT_TRANSFORMER = Object.freeze({
  from: (value) => (value === null || value === undefined ? null : Number(value)),
  to: (value) => value,
});

export const createPrimaryVarcharIdColumn = () => ({
  primary: true,
  type: "varchar",
  generated: false,
  nullable: false,
});

export const createRequiredVarcharColumn = (overrides = {}) => ({
  type: "varchar",
  generated: false,
  nullable: false,
  ...overrides,
});

export const createNullableVarcharColumn = (overrides = {}) => ({
  type: "varchar",
  generated: false,
  nullable: true,
  ...overrides,
});

export const createRequiredTextColumn = (overrides = {}) => ({
  type: "text",
  generated: false,
  nullable: false,
  ...overrides,
});

export const createRequiredBooleanColumn = (overrides = {}) => ({
  type: "boolean",
  generated: false,
  nullable: false,
  ...overrides,
});

export const createNullableBigIntColumn = (overrides = {}) => ({
  type: "bigint",
  generated: false,
  nullable: true,
  transformer: NULLABLE_BIGINT_TRANSFORMER,
  ...overrides,
});

export const createRequiredBigIntColumn = (overrides = {}) => ({
  type: "bigint",
  generated: false,
  nullable: false,
  transformer: IDENTITY_TRANSFORMER,
  ...overrides,
});
