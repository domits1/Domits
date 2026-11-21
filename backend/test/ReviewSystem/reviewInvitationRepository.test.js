jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
import Database from "database";
import { DataSource } from "typeorm";
import { Property } from "database/models/Property";
import { Property_Location } from "database/models/Property_Location";
import { Property_Image } from "database/models/Property_Image";
import { Property_Image_Variant } from "database/models/Property_Image_Variant";
import { ReviewInvitationRepository } from "../../functions/ReviewSystem/data/reviewInvitationRepository.js";

afterEach(() => jest.restoreAllMocks());

test.each([true, false])("loads property details with the first usable web variant, or no photo: %s", async present => {
  const db = new DataSource({ type: "postgres", schema: "main",
    entities: [Property, Property_Location, Property_Image, Property_Image_Variant] });
  await db.buildMetadatas();
  const property = jest.spyOn(db.getRepository(Property), "findOne").mockResolvedValue(present ? { title: "Canal Loft" } : null);
  const location = jest.spyOn(db.getRepository(Property_Location), "findOne").mockResolvedValue(present ? { city: "Amsterdam" } : null);
  const query = db.getRepository(Property_Image).createQueryBuilder("image");
  jest.spyOn(query, "getRawOne").mockResolvedValue(present ? { s3_key: "images/p1/second/web.jpg" } : undefined);
  jest.spyOn(db.getRepository(Property_Image), "createQueryBuilder").mockReturnValue(query);
  Database.getInstance.mockResolvedValue(db);

  expect(await new ReviewInvitationRepository().getDetails("p1")).toEqual(present
    ? { propertyTitle: "Canal Loft", city: "Amsterdam", imageKey: "images/p1/second/web.jpg" }
    : { propertyTitle: undefined, city: undefined, imageKey: undefined });
  expect(property).toHaveBeenCalledWith({ where: { id: "p1" }, select: ["title"] });
  expect(location).toHaveBeenCalledWith({ where: { property_id: "p1" }, select: ["city"] });
  const sql = query.getQuery();
  // Joining variants before LIMIT skips early images that have no web variant.
  expect(sql).toContain('INNER JOIN "main"."property_image_variant" "variant" ON "variant"."image_id" = "image"."id"');
  expect(sql).toContain('"variant"."variant" = :variant');
  expect(sql).toContain('"image"."property_id" = :propertyId');
  expect(sql).toContain('"image"."status" = :status');
  expect(sql).toContain('TRIM("variant"."s3_key") <>');
  expect(sql).toContain('ORDER BY "image"."sort_order" ASC, "image"."id" ASC, "variant"."id" ASC LIMIT 1');
  expect(query.getParameters()).toEqual({ variant: "web", propertyId: "p1", status: "READY" });
});
