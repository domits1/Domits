import Database from "database";
import { Booking } from "database/models/Booking";

export class PropertyDeletionRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  quoteIdentifier(identifier) {
    return `"${String(identifier).replaceAll('"', '""')}"`;
  }

  quoteQualifiedName(qualifiedName) {
    return String(qualifiedName)
      .split(".")
      .map((part) => this.quoteIdentifier(part))
      .join(".");
  }

  getTableCandidates(tableName) {
    const normalized = String(tableName || "").trim();
    if (!normalized) {
      return [];
    }
    if (normalized.includes(".")) {
      return [normalized];
    }
    return Array.from(new Set([normalized, `main.${normalized}`, `test.${normalized}`]));
  }

  parseQualifiedName(tableName) {
    const normalized = String(tableName || "").trim();
    const [maybeSchema, maybeTable] = normalized.split(".");
    if (maybeTable) {
      return { schema: maybeSchema, table: maybeTable };
    }
    return { schema: null, table: maybeSchema };
  }

  async tableExists(transactionManager, tableName) {
    const tableExistsResult = await transactionManager.query(
      "SELECT to_regclass($1) AS table_name",
      [tableName]
    );
    return Array.isArray(tableExistsResult) && Boolean(tableExistsResult[0]?.table_name);
  }

  async findExistingColumn(transactionManager, tableName, columnCandidates) {
    const { schema, table } = this.parseQualifiedName(tableName);
    const normalizedCandidates = Array.from(
      new Set((Array.isArray(columnCandidates) ? columnCandidates : []).map(String))
    );

    if (!table || normalizedCandidates.length === 0) {
      return null;
    }

    const normalizedCandidatesLower = normalizedCandidates.map((candidate) => candidate.toLowerCase());
    const columnPlaceholders = normalizedCandidatesLower.map((_, index) => `$${index + 2}`).join(", ");
    const params = [table, ...normalizedCandidatesLower];
    let schemaCondition = "table_schema = ANY(current_schemas(true))";

    if (schema) {
      params.push(schema);
      schemaCondition = `table_schema = $${params.length}`;
    }

    const result = await transactionManager.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = $1
         AND ${schemaCondition}
         AND lower(column_name) IN (${columnPlaceholders})`,
      params
    );

    const rows = Array.isArray(result) ? result : [];
    const foundByLower = new Map();
    rows.forEach((row) => {
      if (row?.column_name) {
        foundByLower.set(String(row.column_name).toLowerCase(), String(row.column_name));
      }
    });

    for (const candidate of normalizedCandidatesLower) {
      const match = foundByLower.get(candidate);
      if (match) {
        return match;
      }
    }

    return null;
  }

  async deleteByScopedColumnIfExists(transactionManager, tableName, columnCandidates, value) {
    const tableCandidates = this.getTableCandidates(tableName);
    for (const tableCandidate of tableCandidates) {
      const exists = await this.tableExists(transactionManager, tableCandidate);
      if (!exists) {
        continue;
      }

      const columnName = await this.findExistingColumn(transactionManager, tableCandidate, columnCandidates);
      if (!columnName) {
        continue;
      }

      await transactionManager.query(
        `DELETE FROM ${this.quoteQualifiedName(tableCandidate)} WHERE ${this.quoteIdentifier(columnName)} = $1`,
        [value]
      );
      return true;
    }
    return false;
  }

  async deleteRowsByScopedIdsIfExists(transactionManager, tableName, columnCandidates, values) {
    const ids = (Array.isArray(values) ? values : []).filter(Boolean);
    if (ids.length === 0) {
      return false;
    }

    const tableCandidates = this.getTableCandidates(tableName);
    for (const tableCandidate of tableCandidates) {
      const exists = await this.tableExists(transactionManager, tableCandidate);
      if (!exists) {
        continue;
      }

      const columnName = await this.findExistingColumn(transactionManager, tableCandidate, columnCandidates);
      if (!columnName) {
        continue;
      }

      await transactionManager.query(
        `DELETE FROM ${this.quoteQualifiedName(tableCandidate)} WHERE ${this.quoteIdentifier(columnName)} = ANY($1)`,
        [ids]
      );
      return true;
    }
    return false;
  }

  async getScopedIds(transactionManager, tableName, idColumnCandidates, filterColumnCandidates, filterValue) {
    const tableCandidates = this.getTableCandidates(tableName);
    for (const tableCandidate of tableCandidates) {
      const exists = await this.tableExists(transactionManager, tableCandidate);
      if (!exists) {
        continue;
      }

      const idColumn = await this.findExistingColumn(transactionManager, tableCandidate, idColumnCandidates);
      const filterColumn = await this.findExistingColumn(transactionManager, tableCandidate, filterColumnCandidates);
      if (!idColumn || !filterColumn) {
        continue;
      }

      const result = await transactionManager.query(
        `SELECT ${this.quoteIdentifier(idColumn)} AS id
         FROM ${this.quoteQualifiedName(tableCandidate)}
         WHERE ${this.quoteIdentifier(filterColumn)} = $1`,
        [filterValue]
      );

      return (Array.isArray(result) ? result : []).map((row) => row?.id).filter(Boolean);
    }
    return [];
  }

  async getBookingCountByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const bookingCount = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.property_id = :propertyId", { propertyId })
      .getCount();
    return Number(bookingCount || 0);
  }

  async deleteUnifiedMessagingRows(transactionManager, propertyId) {
    const threadIds = await this.getScopedIds(
      transactionManager,
      "unified_thread",
      ["id"],
      ["propertyid", "property_id", "propertyId"],
      propertyId
    );

    await this.deleteRowsByScopedIdsIfExists(
      transactionManager,
      "unified_message",
      ["threadid", "thread_id", "threadId"],
      threadIds
    );

    await this.deleteByScopedColumnIfExists(
      transactionManager,
      "unified_thread",
      ["propertyid", "property_id", "propertyId"],
      propertyId
    );
  }

  async deletePropertyById(propertyId) {
    const client = await Database.getInstance();
    await client.transaction(async (transactionManager) => {
      const propertyScopedTables = [
        { tableName: "guest_favorite", propertyColumns: ["propertyid", "property_id", "propertyId"] },
        { tableName: "property_availability", propertyColumns: ["property_id"] },
        { tableName: "property_availabilityrestriction", propertyColumns: ["property_id"] },
        { tableName: "property_amenity", propertyColumns: ["property_id"] },
        { tableName: "property_checkin", propertyColumns: ["property_id"] },
        { tableName: "property_generaldetail", propertyColumns: ["property_id"] },
        { tableName: "property_location", propertyColumns: ["property_id"] },
        { tableName: "property_pricing", propertyColumns: ["property_id"] },
        { tableName: "property_rule", propertyColumns: ["property_id"] },
        { tableName: "property_technicaldetails", propertyColumns: ["property_id"] },
        { tableName: "property_type", propertyColumns: ["property_id"] },
        { tableName: "property_test_status", propertyColumns: ["property_id"] },
      ];

      for (const tableConfig of propertyScopedTables) {
        await this.deleteByScopedColumnIfExists(
          transactionManager,
          tableConfig.tableName,
          tableConfig.propertyColumns,
          propertyId
        );
      }

      await this.deleteUnifiedMessagingRows(transactionManager, propertyId);

      await this.deleteByScopedColumnIfExists(
        transactionManager,
        "property_calendar_price",
        ["property_id"],
        propertyId
      );

      await this.deleteByScopedColumnIfExists(
        transactionManager,
        "property_ical_source",
        ["property_id"],
        propertyId
      );

      await this.deleteByScopedColumnIfExists(transactionManager, "property_draft", ["property_id"], propertyId);

      const propertyDeleted = await this.deleteByScopedColumnIfExists(
        transactionManager,
        "property",
        ["id"],
        propertyId
      );
      if (!propertyDeleted) {
        throw new Error("Property table could not be resolved for deletion.");
      }
    });
  }
}
