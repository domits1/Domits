import Database from "database";
import { listSourcesWithLimit, upsertSourceRecord } from "../.shared/icalSourceRepositoryHelpers.js";

export class Repository {
  async listSources(limit) {
    const client = await Database.getInstance();
    return listSourcesWithLimit(client, limit, { order: "ASC", tolerateMissingTable: true });
  }

  async upsertSource(payload) {
    const client = await Database.getInstance();
    await upsertSourceRecord(client, payload);
  }
}
