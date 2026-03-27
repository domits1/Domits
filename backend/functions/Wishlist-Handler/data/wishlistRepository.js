import Database from "database";
import { Guest_Favorite } from "database/models/Guest_Favorite";

export class WishlistRepository {
  async put(item) {
    const client = await Database.getInstance();
    await client.getRepository(Guest_Favorite).save({
      guestId: item.guestId,
      wishlistKey: item.wishlistKey,
      wishlistName: item.wishlistName,
      propertyId: item.propertyId ?? null,
      isPlaceholder: item.isPlaceholder ?? false,
    });
    return item;
  }

  async delete({ guestId, wishlistKey }) {
    const client = await Database.getInstance();
    const result = await client.getRepository(Guest_Favorite).delete({ guestId, wishlistKey });
    return Number(result?.affected ?? 0) > 0;
  }

  async queryByGuestId(guestId) {
    const client = await Database.getInstance();
    return await client
      .getRepository(Guest_Favorite)
      .createQueryBuilder("gf")
      .where("gf.guestId = :guestId", { guestId })
      .getMany();
  }
}
