import { PropertyTestStatus } from "../../business/model/propertyTestStatus.js";

export class PropertyTestStatusMapping {
  static mapDatabaseEntryToPropertyTestStatus(TestStatusEntry) {
    return new PropertyTestStatus(TestStatusEntry.property_id, TestStatusEntry.istest);
  }
}
