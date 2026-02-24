import Database from "database";
import { Booking } from "database/models/Booking";
import { Guest_Favorite } from "database/models/Guest_Favorite";
import { Property } from "database/models/Property";
import { Property_Amenity } from "database/models/Property_Amenity";
import { Property_Availability } from "database/models/Property_Availability";
import { Property_Availability_Restriction } from "database/models/Property_Availability_Restriction";
import { Property_Check_In } from "database/models/Property_Check_In";
import { Property_Draft } from "database/models/Property_Draft";
import { Property_General_Detail } from "database/models/Property_General_Detail";
import { Property_Location } from "database/models/Property_Location";
import { Property_Pricing } from "database/models/Property_Pricing";
import { Property_Rule } from "database/models/Property_Rule";
import { Property_Technical_Details } from "database/models/Property_Technical_Details";
import { Property_Test_Status } from "database/models/Property_Test_Status";
import { Property_Type } from "database/models/Property_Type";
import { UnifiedMessage } from "database/models/UnifiedMessage";
import { UnifiedThread } from "database/models/UnifiedThread";

export class PropertyDeletionRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async deleteFromOptionalPropertyScopedTable(transactionManager, tableName, propertyColumn, propertyId) {
    const tableExistsResult = await transactionManager.query(
      "SELECT to_regclass($1) AS table_name",
      [tableName]
    );
    const tableExists = Array.isArray(tableExistsResult) && Boolean(tableExistsResult[0]?.table_name);
    if (!tableExists) {
      return;
    }
    await transactionManager.query(
      `DELETE FROM ${tableName} WHERE ${propertyColumn} = $1`,
      [propertyId]
    );
  }

  async getBookingCountByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const bookingCount = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .where("booking.property_id = :propertyId", { propertyId })
      .getCount();
    return Number(bookingCount || 0);
  }

  async deleteUnifiedMessagingRows(transactionManager, propertyId) {
    let threadIds = [];
    try {
      const threads = await transactionManager
        .getRepository(UnifiedThread)
        .createQueryBuilder("thread")
        .select("thread.id", "id")
        .where("thread.propertyId = :propertyId", { propertyId })
        .getRawMany();
      threadIds = Array.isArray(threads) ? threads.map((thread) => thread.id).filter(Boolean) : [];
    } catch (error) {
      if (error?.code === "42P01") {
        return;
      }
      throw error;
    }

    if (threadIds.length > 0) {
      try {
        await transactionManager
          .createQueryBuilder()
          .delete()
          .from(UnifiedMessage)
          .where("threadId IN (:...threadIds)", { threadIds })
          .execute();
      } catch (error) {
        if (error?.code !== "42P01") {
          throw error;
        }
      }
    }

    await transactionManager
      .createQueryBuilder()
      .delete()
      .from(UnifiedThread)
      .where("propertyId = :propertyId", { propertyId })
      .execute();
  }

  async deletePropertyById(propertyId) {
    const client = await Database.getInstance();
    await client.transaction(async (transactionManager) => {
      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Guest_Favorite)
        .where("propertyId = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Availability)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Availability_Restriction)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Amenity)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Check_In)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_General_Detail)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Location)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Pricing)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Rule)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Technical_Details)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Type)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Test_Status)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await this.deleteUnifiedMessagingRows(transactionManager, propertyId);

      await this.deleteFromOptionalPropertyScopedTable(
        transactionManager,
        "main.property_calendar_price",
        "property_id",
        propertyId
      );

      await this.deleteFromOptionalPropertyScopedTable(
        transactionManager,
        "main.property_ical_source",
        "property_id",
        propertyId
      );

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property_Draft)
        .where("property_id = :propertyId", { propertyId })
        .execute();

      await transactionManager
        .createQueryBuilder()
        .delete()
        .from(Property)
        .where("id = :propertyId", { propertyId })
        .execute();
    });
  }
}
