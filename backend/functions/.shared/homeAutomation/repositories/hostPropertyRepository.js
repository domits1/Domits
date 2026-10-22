import Database from "../../integrations/ORM/index.js";
import { qualifiedTable, requireId, rowsOf } from "./sqlHelpers.js";

// Ownership of a property by a host, for the routes that link a RemoteLock device to it. hostid holds the Cognito
// sub, the same value the token gives the handler.
export default class HostPropertyRepository {
  #getClient;

  constructor({ getClient = () => Database.getInstance() } = {}) {
    this.#getClient = getClient;
  }

  // Both ids are checked before the query: an empty hostid would otherwise be a value to look for.
  // A missing property and a property of another host look the same, so a caller cannot tell them apart.
  async findOwned(userId, propertyId) {
    const host = requireId(userId, "userId");
    const property = requireId(propertyId, "propertyId");

    const client = await this.#getClient();
    const rows = rowsOf(
      await client.query(
        `SELECT id FROM ${qualifiedTable(client, "property")}
         WHERE id = $1 AND hostid = $2
         LIMIT 1`,
        [property, host]
      )
    );
    return rows.length > 0 ? { id: rows[0].id } : null;
  }
}
