import { describe, expect, it } from "@jest/globals";
import { DataSource } from "typeorm";

import { Review } from "database/models/Review";
import { Review_Rating } from "database/models/Review_Rating";
import { Review_Category } from "database/models/Review_Category";
import { Review_Request } from "database/models/Review_Request";
import { Review_Response } from "database/models/Review_Response";
import { Review_Private_Feedback } from "database/models/Review_Private_Feedback";
import { Review_Moderation } from "database/models/Review_Moderation";
import { Review_Verification } from "database/models/Review_Verification";

const sorted = (values) => [...values].sort((left, right) => left.localeCompare(right));

const REVIEW_ENTITIES = [
  {
    entity: Review,
    tableName: "review",
    columns: [
      "id",
      "booking_id",
      "property_id",
      "host_id",
      "reviewer_user_id",
      "reviewee_user_id",
      "review_type",
      "overall_rating",
      "title",
      "public_review",
      "private_feedback",
      "verification_status",
      "publication_status",
      "status",
      "created_at",
      "updated_at",
    ],
  },
  {
    entity: Review_Rating,
    tableName: "review_rating",
    columns: ["id", "review_id", "category", "rating", "created_at"],
  },
  {
    entity: Review_Category,
    tableName: "review_category",
    columns: [
      "id",
      "key",
      "label",
      "description",
      "review_type",
      "is_active",
      "sort_order",
      "created_at",
      "updated_at",
    ],
  },
  {
    entity: Review_Request,
    tableName: "review_request",
    columns: [
      "id",
      "booking_id",
      "property_id",
      "host_id",
      "guest_id",
      "review_type",
      "status",
      "requested_at",
      "expires_at",
      "completed_at",
      "created_at",
      "updated_at",
    ],
  },
  {
    entity: Review_Response,
    tableName: "review_response",
    columns: [
      "id",
      "review_id",
      "author_id",
      "author_role",
      "status",
      "message",
      "created_at",
      "updated_at",
      "published_at",
      "deleted_at",
    ],
  },
  {
    entity: Review_Private_Feedback,
    tableName: "review_private_feedback",
    columns: [
      "id",
      "review_id",
      "reservation_id",
      "guest_id",
      "property_id",
      "feedback_type",
      "message",
      "created_at",
      "updated_at",
    ],
  },
  {
    entity: Review_Moderation,
    tableName: "review_moderation",
    columns: [
      "id",
      "review_id",
      "target_type",
      "status",
      "reason",
      "notes",
      "moderated_by_user_id",
      "moderated_at",
      "created_at",
      "updated_at",
    ],
  },
  {
    entity: Review_Verification,
    tableName: "review_verification",
    columns: [
      "id",
      "review_id",
      "booking_id",
      "status",
      "method",
      "evidence_json",
      "verified_at",
      "created_at",
      "updated_at",
    ],
  },
];

const loadMetadata = async (entity) => {
  const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    username: "test",
    password: "test",
    database: "test",
    entities: REVIEW_ENTITIES.map(({ entity }) => entity),
  });

  await dataSource.buildMetadatas();
  return dataSource.getMetadata(entity);
};

describe("Review system entities", () => {
  it.each(REVIEW_ENTITIES)("maps $tableName columns", async ({ entity, tableName, columns }) => {
    const metadata = await loadMetadata(entity);

    expect(metadata.tableName).toBe(tableName);
    expect(sorted(metadata.columns.map((column) => column.databaseName))).toEqual(sorted(columns));
  });

  it.each(REVIEW_ENTITIES)("uses id as primary key for $tableName", async ({ entity }) => {
    const metadata = await loadMetadata(entity);

    expect(metadata.primaryColumns.map((column) => column.databaseName)).toEqual(["id"]);
  });
});
