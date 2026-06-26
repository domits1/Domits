import { DataSource } from "typeorm";
import { Tables } from "../../.shared/integrations/ORM/util/database/Tables.js";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { BookingAutomationOutbox } from "database/models/automation/BookingAutomationOutbox";
import { MessageAutomation } from "database/models/automation/MessageAutomation";
import { MessageAutomationDelivery } from "database/models/automation/MessageAutomationDelivery";

const buildMetadataOnlyDataSource = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    username: "test",
    password: "test",
    database: "test",
    entities: Tables,
  });

  await dataSource.buildMetadatas();
  return dataSource;
};

describe("AutomatedMessaging shared ORM entity registry", () => {
  test("registers every entity used by AutomatedMessaging repositories", async () => {
    const dataSource = await buildMetadataOnlyDataSource();

    [
      Booking,
      Property,
      MessageAutomation,
      MessageAutomationDelivery,
      BookingAutomationOutbox,
    ].forEach((entity) => {
      expect(dataSource.hasMetadata(entity)).toBe(true);
    });
  });
});
