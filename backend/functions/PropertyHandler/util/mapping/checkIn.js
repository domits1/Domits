import { PropertyCheckIn } from "../../business/model/propertyCheckIn.js";

export class CheckInMapping {
  static mapDatabaseEntryToCheckIn(checkInEntry) {
    const checkInFrom = checkInEntry.checkInFrom ?? checkInEntry.checkinfrom;
    const checkInTill = checkInEntry.checkInTill ?? checkInEntry.checkintill;
    const checkOutFrom = checkInEntry.checkOutFrom ?? checkInEntry.checkoutfrom;
    const checkOutTill = checkInEntry.checkOutTill ?? checkInEntry.checkouttill;
    return new PropertyCheckIn(
      checkInEntry.property_id,
      { from: checkInFrom, till: checkInTill },
      { from: checkOutFrom, till: checkOutTill }
    );
  }
}
