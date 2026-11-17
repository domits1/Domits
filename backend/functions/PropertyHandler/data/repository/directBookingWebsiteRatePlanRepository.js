import Database from "database";
import { randomUUID } from "node:crypto";
import { DirectBookingWebsiteRatePlan } from "database/models/DirectBookingWebsiteRatePlan";
import { isDsqlConflict, withDsqlRetry } from "../../.shared/dsqlRetry.js";

const CURRENT_STATUSES = ["ACTIVE", "PAST_DUE", "TRIALING"];
const UNIQUE_VIOLATION_CODE = "23505";
const END_CURRENT_PERIOD_NOW =
  "CASE WHEN effective_until IS NULL OR effective_until > CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP ELSE effective_until END";

export const UNPAID_PLAN_CHANGE_OUTCOMES = Object.freeze({
  CHANGED: "changed",
  UNCHANGED: "unchanged",
  PAID_PLAN_ACTIVE: "paid_plan_active",
  CONFLICT: "conflict",
});

const isUniqueViolation = (error) =>
  [error?.code, error?.driverError?.code].includes(UNIQUE_VIOLATION_CODE);

const replaceUnpaidPlanInTransaction = async (manager, { accountId, targetPlan }) => {
  const currentPlans = await manager.getRepository(DirectBookingWebsiteRatePlan)
    .createQueryBuilder("plan")
    .where("plan.account_id = :accountId", { accountId })
    .andWhere("plan.status IN (:...statuses)", { statuses: CURRENT_STATUSES })
    .getMany();
  if (currentPlans.some((plan) => plan.stripe_subscription_id)) {
    return { outcome: UNPAID_PLAN_CHANGE_OUTCOMES.PAID_PLAN_ACTIVE };
  }
  const alreadyOnTarget = currentPlans.find((plan) => plan.plan === targetPlan && plan.effective_until === null);
  if (alreadyOnTarget) {
    return { outcome: UNPAID_PLAN_CHANGE_OUTCOMES.UNCHANGED, plan: alreadyOnTarget };
  }

  if (currentPlans.length > 0) {
    await manager.createQueryBuilder()
      .update(DirectBookingWebsiteRatePlan)
      .set({ status: "EXPIRED", effective_until: () => END_CURRENT_PERIOD_NOW, updated_at: () => "CURRENT_TIMESTAMP" })
      .where("account_id = :accountId", { accountId })
      .andWhere("status IN (:...statuses)", { statuses: CURRENT_STATUSES })
      .execute();
  }

  const inserted = await manager.createQueryBuilder()
    .insert()
    .into(DirectBookingWebsiteRatePlan)
    .values({
      id: randomUUID(),
      account_id: accountId,
      plan: targetPlan,
      price_cents: 0,
      currency: "EUR",
      billing_frequency: "monthly",
      status: "ACTIVE",
      effective_until: null,
      stripe_customer_id: currentPlans.find((plan) => plan.stripe_customer_id)?.stripe_customer_id ?? null,
      stripe_subscription_id: null,
    })
    .returning("*")
    .execute();
  return { outcome: UNPAID_PLAN_CHANGE_OUTCOMES.CHANGED, plan: inserted.raw[0] };
};

const applyCurrentScope = (queryBuilder) =>
  queryBuilder
    .andWhere("plan.status IN (:...statuses)", { statuses: CURRENT_STATUSES })
    .andWhere("plan.effective_from <= CURRENT_TIMESTAMP")
    .andWhere("(plan.effective_until IS NULL OR plan.effective_until > CURRENT_TIMESTAMP)");

export class DirectBookingWebsiteRatePlanRepository {
  async findCurrentByAccountId(accountId) {
    const client = await Database.getInstance();
    const query = client.getRepository(DirectBookingWebsiteRatePlan)
      .createQueryBuilder("plan")
      .where("plan.account_id = :accountId", { accountId });
    applyCurrentScope(query);
    return query.orderBy("plan.effective_from", "DESC").getOne();
  }

  async findLatestByAccountId(accountId) {
    const client = await Database.getInstance();
    return client.getRepository(DirectBookingWebsiteRatePlan)
      .createQueryBuilder("plan")
      .where("plan.account_id = :accountId", { accountId })
      .orderBy("plan.effective_from", "DESC")
      .getOne();
  }

  async createPlan(values) {
    const client = await Database.getInstance();
    const repository = client.getRepository(DirectBookingWebsiteRatePlan);
    return repository.save(repository.create(values));
  }

  async updatePlanById(id, values) {
    const client = await Database.getInstance();
    const repository = client.getRepository(DirectBookingWebsiteRatePlan);
    await repository.update({ id }, { ...values, updated_at: new Date() });
    return repository.findOneBy({ id });
  }

  async findByStripeSubscriptionId(stripeSubscriptionId) {
    if (!stripeSubscriptionId) return null;
    const client = await Database.getInstance();
    return client.getRepository(DirectBookingWebsiteRatePlan)
      .createQueryBuilder("plan")
      .where("plan.stripe_subscription_id = :stripeSubscriptionId", { stripeSubscriptionId })
      .getOne();
  }

  async activatePaidPlan(values) {
    const client = await Database.getInstance();
    return client.transaction(async (manager) => {
      const repository = manager.getRepository(DirectBookingWebsiteRatePlan);
      await repository.createQueryBuilder()
        .update(DirectBookingWebsiteRatePlan)
        .set({ status: "EXPIRED", effective_until: values.effectiveFrom, updated_at: new Date() })
        .where("account_id = :accountId", { accountId: values.accountId })
        .andWhere("status IN (:...statuses)", { statuses: CURRENT_STATUSES })
        .execute();

      return repository.save(repository.create({
        account_id: values.accountId,
        plan: values.plan,
        price_cents: values.priceCents,
        currency: values.currency,
        billing_frequency: values.billingFrequency,
        status: values.status,
        effective_from: values.effectiveFrom,
        effective_until: values.effectiveUntil ?? null,
        stripe_customer_id: values.stripeCustomerId ?? null,
        stripe_subscription_id: values.stripeSubscriptionId ?? null,
      }));
    });
  }

  async expireSubscriptionAndCreateEssentials(stripeSubscriptionId, effectiveFrom) {
    const client = await Database.getInstance();
    let accountId = null;

    try {
      return await client.transaction(async (manager) => {
        const repository = manager.getRepository(DirectBookingWebsiteRatePlan);
        const elitePlan = await repository.createQueryBuilder("plan")
          .where("plan.stripe_subscription_id = :stripeSubscriptionId", { stripeSubscriptionId })
          .getOne();
        if (!elitePlan) return null;

        accountId = elitePlan.account_id;

        await repository.createQueryBuilder()
          .update(DirectBookingWebsiteRatePlan)
          .set({ status: "EXPIRED", effective_until: effectiveFrom, updated_at: new Date() })
          .where("id = :id", { id: elitePlan.id })
          .execute();

        const current = await repository.createQueryBuilder("plan")
          .where("plan.account_id = :accountId", { accountId })
          .andWhere("plan.status IN (:...statuses)", { statuses: CURRENT_STATUSES })
          .andWhere("plan.effective_from <= CURRENT_TIMESTAMP")
          .andWhere("(plan.effective_until IS NULL OR plan.effective_until > CURRENT_TIMESTAMP)")
          .orderBy("plan.effective_from", "DESC")
          .getOne();

        if (current) return current;

        return repository.save(repository.create({
          account_id: accountId,
          plan: "essentials",
          price_cents: 0,
          currency: elitePlan.currency || "EUR",
          billing_frequency: elitePlan.billing_frequency || "monthly",
          status: "ACTIVE",
          effective_from: effectiveFrom,
          effective_until: null,
          stripe_customer_id: elitePlan.stripe_customer_id || null,
          stripe_subscription_id: null,
        }));
      });
    } catch (error) {
      if (String(error?.code || "") === "23505" && accountId) {
        const current = await this.findCurrentByAccountId(accountId);
        if (current) return current;
      }
      throw error;
    }
  }

  async replaceUnpaidPlan(change) {
    const client = await Database.getInstance();
    try {
      return await withDsqlRetry(() => client.transaction((manager) => replaceUnpaidPlanInTransaction(manager, change)));
    } catch (error) {
      if (isDsqlConflict(error) || isUniqueViolation(error)) {
        return { outcome: UNPAID_PLAN_CHANGE_OUTCOMES.CONFLICT };
      }
      throw error;
    }
  }
}
