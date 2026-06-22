import { serviceUnavailable } from "../util/httpErrors.js";

export const REQUIRED_SCHEMA = Object.freeze({
  columns: Object.freeze({
    message_automation: [
      "id", "hostid", "propertyid", "name", "triggertype", "offsetamount",
      "offsetunit", "template", "channel", "status", "createdat", "updatedat",
    ],
    message_automation_delivery: [
      "id", "automationid", "bookingid", "eventtype", "eventversion", "scheduledfor",
      "status", "messageid", "failurereason", "templatesnapshot", "renderedcontent",
      "idempotencykey", "createdat", "updatedat", "sentat",
    ],
    booking_automation_outbox: [
      "id", "bookingid", "eventtype", "eventversion", "occurredat", "status",
      "attemptcount", "failurereason", "createdat", "updatedat", "processedat",
    ],
    unified_message: ["direction", "automationdeliveryid"],
    unified_thread: ["bookingid"],
  }),
  indexes: Object.freeze([
    "idx_message_automation_delivery_event_unique",
    "idx_message_automation_delivery_idempotency",
    "idx_booking_automation_outbox_event_unique",
    "idx_unified_message_automation_delivery_unique",
    "idx_unified_thread_domits_booking_unique",
  ]),
});

const key = (objectName, memberName) => `${objectName}.${memberName}`;

export default class SchemaGuard {
  constructor(schemaRepository) {
    this.schemaRepository = schemaRepository;
  }

  async assertReady() {
    const rows = await this.schemaRepository.inspect();
    const columns = new Set();
    const indexes = new Set();

    for (const row of Array.isArray(rows) ? rows : []) {
      if (row.kind === "column") columns.add(key(row.object_name, row.member_name));
      if (row.kind === "index") indexes.add(row.member_name);
    }

    const missingColumns = [];
    for (const [table, requiredColumns] of Object.entries(REQUIRED_SCHEMA.columns)) {
      for (const column of requiredColumns) {
        if (!columns.has(key(table, column))) missingColumns.push(key(table, column));
      }
    }
    const missingIndexes = REQUIRED_SCHEMA.indexes.filter((index) => !indexes.has(index));

    if (missingColumns.length || missingIndexes.length) {
      throw serviceUnavailable("Automated Messaging schema is not ready. Apply the required migrations.", {
        missingColumns,
        missingIndexes,
      });
    }

    return { ready: true };
  }
}
