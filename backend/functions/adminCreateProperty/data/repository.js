import Database from "database";

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

function parseCapacity(text = "") {
  const n = (rx) => {
    const m = text.match(new RegExp("(\\d+)\\s*" + rx, "i"));
    return m ? parseInt(m[1], 10) : null;
  };
  return {
    Guests: n("guest|guests"),
    Bedrooms: n("bedroom|bedrooms"),
    Beds: n("bed|beds"),
    Bathrooms: n("bathroom|bathrooms")
  };
}

async function resolveAmenityId(client, label) {
  try {
    const r1 = await client.query(
      'SELECT id FROM main.amenities WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [label]
    );
    if (r1?.rows?.[0]?.id) return r1.rows[0].id;
  } catch (e) {
    console.log("amenities lookup failed", e?.message);
  }
  try {
    const r2 = await client.query(
      'SELECT id FROM main.amenity_and_category WHERE LOWER(name) = LOWER($1) OR LOWER(amenity) = LOWER($1) LIMIT 1',
      [label]
    );
    if (r2?.rows?.[0]?.id) return r2.rows[0].id;
  } catch (e) {
    console.log("amenity_and_category lookup failed", e?.message);
  }
  return null;
}

export class Repository {
  async createFullProperty(body, hostId) {
    console.log("🔵 Repository.createFullProperty START");
    const client = await Database.getInstance();

    const id = newId();
    const now = Date.now();
    const registrationnumber = numericRegistration(18);

    const propertyRow = {
      id,
      title: body.homeName || "Untitled Property",
      subtitle: body.segment || "Holiday Homes, Boats & Campers",
      description: body.description || "",
      registrationnumber,
      hostid: hostId,
      status: "DRAFT",
      createdat: now,
      updatedat: now
    };

    console.log("📝 property:", propertyRow);
    await client.createQueryBuilder().insert().into("main.property").values(propertyRow).execute();

    const cap = parseCapacity(body.capacity || "");
    const generalRows = [];
    if (Number.isInteger(cap.Guests)) generalRows.push({ id: newId(), detail: "Guests", property_id: id, value: cap.Guests });
    if (Number.isInteger(cap.Bedrooms)) generalRows.push({ id: newId(), detail: "Bedrooms", property_id: id, value: cap.Bedrooms });
    if (Number.isInteger(cap.Beds)) generalRows.push({ id: newId(), detail: "Beds", property_id: id, value: cap.Beds });
    if (Number.isInteger(cap.Bathrooms)) generalRows.push({ id: newId(), detail: "Bathrooms", property_id: id, value: cap.Bathrooms });

    if (generalRows.length > 0) {
      console.log("📝 property_generaldetail rows:", generalRows);
      await client.createQueryBuilder().insert().into("main.property_generaldetail").values(generalRows).execute();
    } else {
      console.log("ℹ️ No parsable capacity values; skipping property_generaldetail");
    }

    if (body.rules) {
      const rules = Array.isArray(body.rules) ? body.rules : [body.rules];
      const ruleRows = rules.map(rule => ({
        property_id: id,
        rule,
        value: true
      }));
      console.log("📝 property_rule rows:", ruleRows);
      for (const row of ruleRows) {
        await client.createQueryBuilder().insert().into("main.property_rule").values(row).execute();
      }
      console.log("✅ property_rule inserted");
    }

    if (body.amenities) {
      const amenities = Array.isArray(body.amenities) ? body.amenities : [body.amenities];
      for (const label of amenities) {
        const amenityId = await resolveAmenityId(client, label);
        if (!amenityId) {
          console.log("⛔ amenity not found, skipping:", label);
          continue;
        }
        await client
          .createQueryBuilder()
          .insert()
          .into("main.property_amenity")
          .values({
            id: newId(),
            property_id: id,
            amenityid: amenityId
          })
          .execute();
      }
      console.log("✅ property_amenity inserted (resolved ids)");
    }

    console.log("✅ Property fully created in all tables");
    return { id, registrationnumber };
  }
}