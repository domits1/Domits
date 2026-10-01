// The worker refuses to run before the migration is applied, so a missing table
// shows up as one clear error instead of a failure per query.
export const REQUIRED_CHANNEX_ARI_SCHEMA = Object.freeze({
  columns: Object.freeze({
    channex_ari_outbox: Object.freeze([
      "id",
      "domitspropertyid",
      "kind",
      "changetypes",
      "datefrom",
      "dateto",
      "source",
      "status",
      "attemptcount",
      "nextattemptat",
      "failurereason",
      "sentsummary",
      "createdat",
      "updatedat",
      "processedat",
    ]),
  }),
  indexes: Object.freeze(["idx_channex_ari_outbox_ready", "idx_channex_ari_outbox_stale"]),
});

const key = (objectName, memberName) => `${objectName}.${memberName}`;

export default class ChannexAriSchemaGuard {
  constructor(schemaRepository) {
    this.schemaRepository = schemaRepository;
  }

  async assertReady() {
    const rows = await this.schemaRepository.inspect();
    const columns = new Set();
    const indexes = new Set();

    for (const row of Array.isArray(rows) ? rows : []) {
      if (row?.kind === "column") columns.add(key(row.object_name, row.member_name));
      if (row?.kind === "index") indexes.add(row.member_name);
    }

    const missingColumns = [];
    for (const [table, requiredColumns] of Object.entries(REQUIRED_CHANNEX_ARI_SCHEMA.columns)) {
      for (const column of requiredColumns) {
        if (!columns.has(key(table, column))) missingColumns.push(key(table, column));
      }
    }
    const missingIndexes = REQUIRED_CHANNEX_ARI_SCHEMA.indexes.filter((index) => !indexes.has(index));

    if (missingColumns.length || missingIndexes.length) {
      const error = new Error("Channex ARI outbox schema is not ready. Apply the migration first.");
      error.code = "CHANNEX_ARI_SCHEMA_NOT_READY";
      error.details = { missingColumns, missingIndexes };
      throw error;
    }

    return { ready: true };
  }
}
