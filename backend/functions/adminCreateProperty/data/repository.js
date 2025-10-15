import Database from "database";
import { Property } from "database/models/Property";

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function numericRegistration(len = 18) {
  const base = Date.now().toString();
  const need = Math.max(0, len - base.length);
  let r = "";
  while (r.length < need) r += Math.floor(Math.random() * 10).toString();
  return base + r.slice(0, need);
}

export class Repository {
  async createProperty(body, hostId) {
    const client = await Database.getInstance();
    const id = newId();
    const now = Date.now();
    const registrationnumber = numericRegistration(18);
    const row = {
      id,
      title: body.name || "New Property",
      subtitle: body.segment || "",
      description: [
        "Created by admin",
        body.email ? `Email: ${body.email}` : "",
        body.phone ? `Phone: ${body.phone}` : "",
        body.restaurantOrCasino ? `(${body.restaurantOrCasino})` : ""
      ].filter(Boolean).join(" · "),
      registrationnumber,
      hostid: hostId,
      status: "DRAFT",
      createdat: now,
      updatedat: 0
    };
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
