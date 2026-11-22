jest.mock("database", () => ({ __esModule: true, default: {} }));
import { ReviewAlertRules, ADMIN_ALERT_TYPES } from "../../functions/ReviewSystem/business/model/reviewAlertRules.js";
import { ReviewAdminAlertCandidateService } from "../../functions/ReviewSystem/business/service/reviewAdminAlertCandidateService.js";
import { ReviewAdminAlertRepository } from "../../functions/ReviewSystem/data/reviewAdminAlertRepository.js";
import { REVIEW_APPROVER_ROLES } from "../../functions/ReviewSystem/auth/reviewAdministrator.js";
import { Review } from "database/models/Review";
import { Review_Alert_Work } from "database/models/Review_Alert_Work";
import { In } from "typeorm";
import { Review_Flag } from "database/models/Review_Flag";
const review = { id: "r", property_id: "p", review_type: "GUEST_TO_PROPERTY", status: "PENDING_APPROVAL",
  publication_status: "UNPUBLISHED", updated_at: 100, private_feedback: "SECRET" };
const flag = { id: "f", review_id: "r", status: "PENDING", created_at: 110 };
const run = (type, changes = {}) => ReviewAlertRules.administrator({ type, review, flag, eventTimestamp: 100, recipients: ["a", "a"], ...changes });
test.each(Object.values(ADMIN_ALERT_TYPES))("normalizes %s and deduplicates stable identities", type => {
  const current = { ...review, status: type === "REVIEW_PENDING_PUBLICATION" ? "APPROVED" : "PENDING_APPROVAL" };
  const rows = run(type, { review: current });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toEqual({ type, recipientUserId: "a", propertyId: "p", reviewId: "r",
    eventKey: expect.any(String), eventTimestamp: type === "REVIEW_FLAGGED" ? 110 : 100 });
  expect(run(type, { review: { ...current, updated_at: 999 } })[0].eventKey).toBe(rows[0].eventKey);
  expect(run(type, { review: current, recipients: ["b"] })[0].eventKey).not.toBe(rows[0].eventKey);
});
test.each(["DRAFT", "REJECTED", "DELETED", "APPROVED", "PUBLISHED"])("rejects pending approval in %s", status => {
  expect(run("REVIEW_PENDING_APPROVAL", { review: { ...review, status } })).toEqual([]);
});
test.each([null, { ...review, review_type: "HOST_TO_GUEST" }, { ...review, publication_status: "PUBLISHED" },
  { ...review, status: "INVALID" }, { ...review, property_id: "" }, { ...review, deleted_at: 1 }])("rejects invalid review %j", current => {
  expect(run("REVIEW_PENDING_APPROVAL", { review: current })).toEqual([]);
});
test("flags require matching pending flag, supported state and unique flag identity", () => {
  for (const invalid of [null, { ...flag, review_id: "other" }, { ...flag, status: "RESOLVED" }, { ...flag, created_at: -1 }]) {
    expect(run("REVIEW_FLAGGED", { flag: invalid })).toEqual([]);
  }
  for (const status of ["DRAFT", "REJECTED", "DELETED"]) expect(run("REVIEW_FLAGGED", { review: { ...review, status } })).toEqual([]);
  for (const status of ["PENDING_APPROVAL", "APPROVED", "PUBLISHED"]) {
    expect(run("REVIEW_FLAGGED", { review: { ...review, status, publication_status: status === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED" } })).toHaveLength(1);
  }
  expect(run("REVIEW_FLAGGED", { flag: { ...flag, id: "f2" } })[0].eventKey).not.toBe(run("REVIEW_FLAGGED")[0].eventKey);
  expect(run("REVIEW_PENDING_PUBLICATION")).toEqual([]);
  expect(run("unsupported")).toEqual([]);
});
test("trusted backend resolution intersects allowlist and active roles, ignoring client recipients", async () => {
  const old = process.env.PROPERTY_REVIEW_ADMIN_USER_IDS;
  process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = "a0,a1; a2\na3 inactive wrong";
  try {
    const members = REVIEW_APPROVER_ROLES.map((role, i) => ({ role, status: "active", member_user_id: `a${i}` }));
    members.push(members[0], { role: REVIEW_APPROVER_ROLES[0], status: "pending", member_user_id: "inactive" },
      { role: "Owner", status: "active", member_user_id: "wrong" },
      { role: REVIEW_APPROVER_ROLES[0], status: "active", member_user_id: "outside" },
      { role: REVIEW_APPROVER_ROLES[0], status: "active", member_user_id: null });
    const findFlag = jest.fn().mockResolvedValue(flag);
    const findMembers = jest.fn(async () => members);
    const repository = new ReviewAdminAlertRepository({ getDatabase: async () => ({ getRepository: model => model === Review_Alert_Work ? { findOneBy: async () => ({ payload: JSON.stringify({
        phase: "admin", type: "REVIEW_FLAGGED", reviewId: "r", flagId: "f", eventTimestamp: 110 }) }) } : model === Review
      ? { findOne: async () => review } : model === Review_Flag ? { findOne: findFlag } : { find: findMembers } }) });
    const service = new ReviewAdminAlertCandidateService({ repository });
    expect((await service.evaluate({ type: "REVIEW_FLAGGED", reviewId: "r", flagId: "f", recipientUserId: "attacker" }))
      .map(row => row.recipientUserId)).toEqual(["a0", "a1", "a2", "a3"]);
    expect(findFlag).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "f", review_id: "r", status: "PENDING" } }));
    expect(findMembers).toHaveBeenCalledWith(expect.objectContaining({ where: {
      status: "active", role: In(REVIEW_APPROVER_ROLES), member_user_id: In(["a0", "a1", "a2", "a3", "inactive", "wrong"]),
    } }));
    process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = "";
    expect(await service.evaluate({ type: "REVIEW_PENDING_APPROVAL", reviewId: "r" })).toEqual([]);
  } finally { if (old === undefined) delete process.env.PROPERTY_REVIEW_ADMIN_USER_IDS; else process.env.PROPERTY_REVIEW_ADMIN_USER_IDS = old; }
});
test("invalid event references avoid reads; mismatched backend reviews return no candidates", async () => {
  const repository = { load: jest.fn().mockResolvedValue({ review: { ...review, id: "other" }, recipients: ["a"] }) };
  const service = new ReviewAdminAlertCandidateService({ repository });
  for (const input of [{}, { type: "NEW_REVIEW", reviewId: "r" }, { type: "REVIEW_FLAGGED", reviewId: "r" }]) expect(await service.evaluate(input)).toEqual([]);
  expect(repository.load).not.toHaveBeenCalled();
  expect(await service.evaluate({ type: "REVIEW_PENDING_APPROVAL", reviewId: "r" })).toEqual([]);
});

import { ReviewAlertRepository } from "../../functions/ReviewSystem/data/reviewAlertRepository.js";
test.each(Object.values(ADMIN_ALERT_TYPES))("existing review_alert repository accepts %s with atomic deduplication", async alert_type => {
  const query = { insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(), returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValueOnce({ raw: [{ id: "a" }] }).mockResolvedValue({ raw: [] }) };
  const repository = new ReviewAlertRepository({ getDatabase: async () => ({ getRepository: () => ({ createQueryBuilder: () => query }) }) });
  const row = { recipient_user_id: "admin", property_id: "p", review_id: "r", alert_type, event_key: "key" };
  expect(await repository.createAlertIfMissing(row)).toBe(true);
  expect(await repository.createAlertIfMissing(row)).toBe(false);
  expect(query.onConflict).toHaveBeenCalledWith('("recipient_user_id", "event_key") DO NOTHING');
});

test.each([undefined, NaN, -1, 8640000000000001])("rejects invalid immutable event time %s", eventTimestamp => {
  expect(run("REVIEW_PENDING_APPROVAL", { eventTimestamp })).toEqual([]);
});
