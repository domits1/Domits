import Database from "database";
import { Property } from "database/models/Property";

export class Repository {
  async createProperty(row) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .insert()
      .into(Property)
      .values({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        registrationnumber: row.registrationnumber,
        hostid: row.hostid,
        status: row.status,
        createdat: row.createdat,
        updatedat: row.updatedat
      })
      .execute();
    return { id: row.id };
  }
}