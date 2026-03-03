import Database from "database";
import { listSourcesByProperty, upsertSourceRecord } from "../../.shared/icalSourceRepositoryHelpers.js";

class ExternalCalendarRepository {
  async listSources(propertyId) {
    const client = await Database.getInstance();
    return listSourcesByProperty(client, propertyId, { order: "DESC", tolerateMissingTable: true });
  }

  async upsertSource(payload) {
    const client = await Database.getInstance();
    await upsertSourceRecord(client, payload);
  }
}

export default ExternalCalendarRepository;
