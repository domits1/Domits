import { PropertyTestStatus } from "../../business/model/propertyTestStatus.js";

export class PropertyTestStatusMapping {
  static mapDatabaseEntryToCheckIn(TestStatusEntry) {
    return new PropertyTestStatus(TestStatusEntry.property_id, TestStatusEntry.isTest);
  }
}
