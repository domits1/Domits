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

function norm(s) {
  return String(s || "").trim();
}

async function upsertAmenity(client, amenityLabel) {
  const a = norm(amenityLabel);
  if (!a) return null;
  const sel = await client.query(
    `SELECT amenity FROM main.amenities
     WHERE regexp_replace(lower(amenity),'[^a-z0-9]+','','g')
           = regexp_replace(lower($1),'[^a-z0-9]+','','g')
     LIMIT 1`,
    [a]
  );
  if (sel?.rows?.[0]?.amenity) return sel.rows[0].amenity;
  await client.query(`INSERT INTO main.amenities (amenity) VALUES ($1) ON CONFLICT DO NOTHING`, [a]);
  const check = await client.query(
    `SELECT amenity FROM main.amenities
     WHERE regexp_replace(lower(amenity),'[^a-z0-9]+','','g')
           = regexp_replace(lower($1),'[^a-z0-9]+','','g')
     LIMIT 1`,
    [a]
  );
  return check?.rows?.[0]?.amenity || null;
}

async function upsertCategory(client, categoryLabel) {
  const c = norm(categoryLabel);
  if (!c) return null;
  const sel = await client.query(
    `SELECT category FROM main.amenity_categories
     WHERE regexp_replace(lower(category),'[^a-z0-9]+','','g')
           = regexp_replace(lower($1),'[^a-z0-9]+','','g')
     LIMIT 1`,
    [c]
  );
  if (sel?.rows?.[0]?.category) return sel.rows[0].category;
  await client.query(`INSERT INTO main.amenity_categories (category) VALUES ($1) ON CONFLICT DO NOTHING`, [c]);
  const check = await client.query(
    `SELECT category FROM main.amenity_categories
     WHERE regexp_replace(lower(category),'[^a-z0-9]+','','g')
           = regexp_replace(lower($1),'[^a-z0-9]+','','g')
     LIMIT 1`,
    [c]
  );
  return check?.rows?.[0]?.category || null;
}

async function findAmenityCategoryId(client, amenity, category) {
  if (amenity && category) {
    const r = await client.query(
      `SELECT id FROM main.amenity_and_category
       WHERE regexp_replace(lower(amenity),'[^a-z0-9]+','','g')
             = regexp_replace(lower($1),'[^a-z0-9]+','','g')
         AND regexp_replace(lower(category),'[^a-z0-9]+','','g')
             = regexp_replace(lower($2),'[^a-z0-9]+','','g')
       LIMIT 1`,
      [amenity, category]
    );
    if (r?.rows?.[0]?.id) return r.rows[0].id;
  }
  if (amenity) {
    const r2 = await client.query(
      `SELECT id FROM main.amenity_and_category
       WHERE regexp_replace(lower(amenity),'[^a-z0-9]+','','g')
             = regexp_replace(lower($1),'[^a-z0-9]+','','g')
       LIMIT 1`,
      [amenity]
    );
    if (r2?.rows?.[0]?.id) return r2.rows[0].id;
  }
  return null;
}

async function ensureAmenityAndCategoryId(client, amenityLabel, categoryLabel) {
  const a = await upsertAmenity(client, amenityLabel);
  const c = await upsertCategory(client, categoryLabel);
  if (!a || !c) return null;
  const existing = await findAmenityCategoryId(client, a, c);
  if (existing) return existing;
  const id = newId();
  await client.query(
    `INSERT INTO main.amenity_and_category (id, amenity, category, "eco-score")
     VALUES ($1, $2, $3, $4)`,
    [id, a, c, "0"]
  );
  return id;
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
        await client.createQueryBuilder().insert().into("main.property_rule").values({ id: newId(), property_id: id, rule, value: true }).execute();
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
      const amenityid = await ensureAmenityAndCategoryId(client, amenityName, categoryName);
      if (!amenityid) continue;
      await client.createQueryBuilder().insert().into("main.property_amenity").values({
        id: newId(),
        property_id: id,
        amenityid
      }).execute();
    }

    const roomrate = parseMoneyToInt(body.rate);
    if (roomrate !== null) {
      await client.createQueryBuilder().insert().into("main.property_pricing").values({
        id: newId(),
        property_id: id,
        roomrate,
        cleaning: null
      }).execute();
    }

    const provided = Array.isArray(body.images) ? body.images : [];
    if (provided.length > 0) {
      const rows = provided.map(x => ({ id: newId(), property_id: id, key: x.key || String(x) }));
      await client.createQueryBuilder().insert().into("main.property_image").values(rows).execute();
    } else {
      const placeholders = [
        "images/placeholders/Picture1.jpg",
        "images/placeholders/Picture2.jpg",
        "images/placeholders/Picture3.jpg",
        "images/placeholders/Picture4.jpg",
        "images/placeholders/Picture5.jpg"
      ].map(k => ({ id: newId(), property_id: id, key: k }));
      await client.createQueryBuilder().insert().into("main.property_image").values(placeholders).execute();
    }

    const street = body.street || "";
    const housenumber = parseInt(body.houseNumber || "0", 10) || 0;
    const housenumberextension = "";
    const postalcode = body.postalCode || "";
    const city = body.city || "";
    const country = body.country || "";
    await client.createQueryBuilder().insert().into("main.property_location").values({
      id: newId(),
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
      id: newId(),
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
      id: newId(),
      property_id: id,
      checkinfrom,
      checkintill,
      checkoutfrom,
      checkouttill
    }).execute();

    const availablestartdate = now;
    const availableenddate = 4102444800000;
    await client.createQueryBuilder().insert().into("main.property_availability").values({
      id: newId(),
      property_id: id,
      availablestartdate,
      availableenddate
    }).execute();

    return { id, registrationnumber };
  }
}