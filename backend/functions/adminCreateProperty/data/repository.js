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
    console.log("🔵 Repository.createProperty START");
    const client = await Database.getInstance();
    console.log("✅ Database client ready");

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

    console.log("📝 Row to insert:", row);

    try {
      await client
        .createQueryBuilder()
        .insert()
        .into(Property)
        .values(row)
        .execute();

      console.log("✅ Insert succeeded for:", { id, registrationnumber });
      return { id, registrationnumber };
    } catch (err) {
      console.error("❌ Insert failed:", err);
      throw err;
    }
  }
}