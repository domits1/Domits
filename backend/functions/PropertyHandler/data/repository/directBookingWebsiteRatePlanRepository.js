import Database from "database";
import { DirectBookingWebsiteRatePlan } from "database/models/DirectBookingWebsiteRatePlan";

const CURRENT_STATUSES = ["ACTIVE", "PAST_DUE", "TRIALING"];

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
}
