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
  const t = String(text || "").trim();
  if (!t) return {};
  if (/^\d+$/.test(t)) return { Guests: parseInt(t, 10) };
  const csv = t.split(",").map(s => s.trim()).filter(Boolean);
  if (csv.length && csv.every(s => /^\d+$/.test(s))) {
    const nums = csv.map(n => parseInt(n, 10));
    return { Guests: nums[0] ?? null, Bedrooms: nums[1] ?? null, Beds: nums[2] ?? null, Bathrooms: nums[3] ?? null };
  }
  const n = (rx) => {
    const m = t.match(new RegExp("(\\d+)\\s*" + rx, "i"));
    return m ? parseInt(m[1], 10) : null;
  };
  return { Guests: n("guest|guests"), Bedrooms: n("bedroom|bedrooms"), Beds: n("bed|beds"), Bathrooms: n("bathroom|bathrooms") };
}

function parseMoneyToInt(str) {
  if (!str) return null;
  const digits = String(str).replace(/[^\d]/g, "");
  if (!digits) return null;
  return parseInt(digits, 10);
}

function hhmmToPgTimeOrNull(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{2}):(\d{2})/);
  if (!m) return null;
  const hh = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  return `${hh}:${mm}:00`;
}

async function resolveAmenityId(client, amenityLabel, categoryLabel) {
  if (!amenityLabel) return null;
  const a = String(amenityLabel).trim();
  const c = categoryLabel ? String(categoryLabel).trim() : null;
  if (c) {
    const r = await client.query('SELECT id FROM main.amenity_and_category WHERE LOWER(amenity)=LOWER($1) AND LOWER(category)=LOWER($2) LIMIT 1', [a, c]);
    if (r?.rows?.[0]?.id) return r.rows[0].id;
  }
  const r2 = await client.query('SELECT id FROM main.amenity_and_category WHERE LOWER(amenity)=LOWER($1) LIMIT 1', [a]);
  if (r2?.rows?.[0]?.id) return r2.rows[0].id;
  const r3 = await client.query('SELECT amenity AS id FROM main.amenities WHERE LOWER(amenity)=LOWER($1) LIMIT 1', [a]);
  return r3?.rows?.[0]?.id ?? null;
}

export class Repository {
  async createFullProperty(body, hostId) {
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

    await client.createQueryBuilder().insert().into("main.property").values(propertyRow).execute();

    const cap = parseCapacity(body.capacity || "");
    const generalRows = [];
    if (Number.isInteger(cap.Guests)) generalRows.push({ id: newId(), detail: "Guests", property_id: id, value: cap.Guests });
    if (Number.isInteger(cap.Bedrooms)) generalRows.push({ id: newId(), detail: "Bedrooms", property_id: id, value: cap.Bedrooms });
    if (Number.isInteger(cap.Beds)) generalRows.push({ id: newId(), detail: "Beds", property_id: id, value: cap.Beds });
    if (Number.isInteger(cap.Bathrooms)) generalRows.push({ id: newId(), detail: "Bathrooms", property_id: id, value: cap.Bathrooms });
    if (generalRows.length > 0) {
      await client.createQueryBuilder().insert().into("main.property_generaldetail").values(generalRows).execute();
    }

    if (body.rules) {
      const rules = Array.isArray(body.rules) ? body.rules : [body.rules];
      for (const rule of rules) {
        await client.createQueryBuilder().insert().into("main.property_rule").values({ property_id: id, rule, value: true }).execute();
      }
    }

    const amenList = Array.isArray(body.amenities) ? body.amenities : [];
    for (const item of amenList) {
      let amenityName = null;
      let categoryName = null;
      if (item && typeof item === "object") {
        amenityName = item.amenity;
        categoryName = item.category;
      } else if (typeof item === "string") {
        amenityName = item;
      }
      const amenityId = await resolveAmenityId(client, amenityName, categoryName);
      if (!amenityId) continue;
      await client.createQueryBuilder().insert().into("main.property_amenity").values({
        id: newId(),
        property_id: id,
        amenityid: amenityId
      }).execute();
    }

    const roomrate = parseMoneyToInt(body.rate);
    if (roomrate !== null) {
      await client.createQueryBuilder().insert().into("main.property_pricing").values({
        property_id: id,
        roomrate,
        cleaning: null
      }).execute();
    }

    const provided = Array.isArray(body.images) ? body.images : [];
    if (provided.length > 0) {
      const rows = provided.map(x => ({ property_id: id, key: x.key || String(x) }));
      await client.createQueryBuilder().insert().into("main.property_image").values(rows).execute();
    } else {
      const placeholders = [
        "images/placeholders/Picture1.jpg",
        "images/placeholders/Picture2.jpg",
        "images/placeholders/Picture3.jpg",
        "images/placeholders/Picture4.jpg",
        "images/placeholders/Picture5.jpg"
      ].map(k => ({ property_id: id, key: k }));
      await client.createQueryBuilder().insert().into("main.property_image").values(placeholders).execute();
    }

    const street = body.street || "";
    const housenumber = parseInt(body.houseNumber || "0", 10) || 0;
    const housenumberextension = "";
    const postalcode = body.postalCode || "";
    const city = body.city || "";
    const country = body.country || "";
    await client.createQueryBuilder().insert().into("main.property_location").values({
      property_id: id,
      city,
      country,
      housenumber,
      housenumberextension,
      postalcode,
      street
    }).execute();

    const spacetype = body.spaceType || "Entire Space";
    const type = body.segment || "Holiday Homes, Boats & Campers";
    await client.createQueryBuilder().insert().into("main.property_type").values({
      property_id: id,
      spacetype,
      type
    }).execute();

    const ci = hhmmToPgTimeOrNull(body.checkIn);
    const co = hhmmToPgTimeOrNull(body.checkOut);
    const checkinfrom = ci || "15:00:00";
    const checkintill = ci || "22:00:00";
    const checkoutfrom = co || "07:00:00";
    const checkouttill = co || "11:00:00";
    await client.createQueryBuilder().insert().into("main.property_checkin").values({
      property_id: id,
      checkinfrom,
      checkintill,
      checkoutfrom,
      checkouttill
    }).execute();

    const availablestartdate = now;
    const availableenddate = 4102444800000;
    await client.createQueryBuilder().insert().into("main.property_availability").values({
      property_id: id,
      availablestartdate,
      availableenddate
    }).execute();

    return { id, registrationnumber };
  }
}