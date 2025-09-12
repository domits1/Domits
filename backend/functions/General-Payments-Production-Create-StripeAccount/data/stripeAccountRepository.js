import Database from "database";
import { Stripe_Connected_Accounts } from "database/models/Stripe_Connected_Accounts";
import "dotenv/config";
  
class StripeAccountRepository {
  constructor() {}

  async getExistingStripeAccount(cognitoUserId) {
    const client = await Database.getInstance();
    const record = await client
      .getRepository(Stripe_Connected_Accounts)
      .createQueryBuilder("stripe_accounts")
      .where("stripe_accounts.user_id = :user_id", { user_id: cognitoUserId })
      .getOne();
      
    return record;
  }

  async insertStripeAccount(id, accountId, cognitoUserId, currentTime, updatedAt) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .insert()
      .into(Stripe_Connected_Accounts)
      .values({
        id: id,
        account_id: accountId,
        user_id: cognitoUserId,
        created_at: currentTime,
        updated_at: updatedAt
      })
      .execute();
  }
}

export default StripeAccountRepository;
