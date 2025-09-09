import { PropertyCheckIn } from "../../business/model/propertyCheckIn.js";

export class CheckInMapping {

    static mapDatabaseEntryToCheckIn(checkInEntry) {
        return new PropertyCheckIn(
            checkInEntry.property_id,
            {"from": checkInEntry.checkinfrom, "till": checkInEntry.checkintill},
            {"from": checkInEntry.checkoutfrom, "till": checkInEntry.checkouttill}
        )
    }
}