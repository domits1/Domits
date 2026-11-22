import { createHash } from "node:crypto";
import Database from "database";
import { IsNull, LessThanOrEqual } from "typeorm";
import { Review_Alert_Work } from "database/models/Review_Alert_Work";
import { Review } from "database/models/Review";
import { Review_Response } from "database/models/Review_Response";
import { Property } from "database/models/Property";
import { HostReviewRepository } from "./hostReviewRepository.js";

export const enqueueReviewAlertWork = (manager, id, payload, due_at) => manager.getRepository(Review_Alert_Work)
  .createQueryBuilder().insert().values({ id, payload: JSON.stringify(payload), due_at, version: 0 })
  .onConflict('(\"id\") DO NOTHING').execute();

export const adminReviewAlertWorkId = (type, reviewId, flagId) => `admin:${createHash("sha256")
  .update(JSON.stringify([type, reviewId, flagId ?? null])).digest("hex")}`;
export const enqueueAdminReviewAlert = (manager, type, reviewId, eventTimestamp, flagId) =>
  enqueueReviewAlertWork(manager, adminReviewAlertWorkId(type, reviewId, flagId),
    { phase: "admin", type, reviewId, eventTimestamp, ...(flagId ? { flagId } : {}) }, eventTimestamp);

export class ReviewAlertWorkRepository {
  async store() { return (await Database.getInstance()).getRepository(Review_Alert_Work); }
  async seed(end) { return enqueueReviewAlertWork(await Database.getInstance(), `trend:${end}`, { end, afterHost: "" }, end); }
  async find(id) { return (await this.store()).findOneBy({ id }); }
  async due(now) { return (await this.store()).find({ where: { due_at: LessThanOrEqual(now) }, order: { due_at: "ASC", id: "ASC" }, take: 25 }); }
  async advance(job, payload, due_at) {
    return (await this.store()).update({ id: job.id, version: job.version }, { payload: JSON.stringify(payload), due_at, version: job.version + 1 });
  }
  async context(id, now) {
    const database = await Database.getInstance();
    const review = await database.getRepository(Review).findOne({ where: { id },
      select: ["id", "property_id", "host_id", "review_type", "overall_rating", "status", "publication_status"] });
    const responses = await database.getRepository(Review_Response).find({ where: {
      reviewId: id, authorRole: "host", status: "published", deletedAt: IsNull(), publishedAt: LessThanOrEqual(now),
    }, select: ["reviewId", "authorRole", "status", "deletedAt", "publishedAt"], take: 1 });
    return { review, responses };
  }
  async nextHost(afterHost) {
    const database = await Database.getInstance();
    return (await database.getRepository(Property).createQueryBuilder("p").select("p.hostid", "id")
      .where("p.hostid > :afterHost", { afterHost }).groupBy("p.hostid").orderBy("p.hostid", "ASC").limit(1).getRawOne())?.id;
  }
  trend(host, options) { return new HostReviewRepository().getPropertyRatingTrendPage(host, options); }
}
