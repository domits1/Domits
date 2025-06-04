import { PropertyCheckIn } from "../../business/model/propertyCheckIn.js";

export class CheckInMapping {

    static mapDatabaseEntryToCheckIn(checkInEntry) {
        return new PropertyCheckIn(
            checkInEntry.property_id.S,
            {"from": parseFloat(checkInEntry.checkIn.M.from.N), "till": parseFloat(checkInEntry.checkIn.M.till.N)},
            {"from": parseFloat(checkInEntry.checkOut.M.from.N), "till": parseFloat(checkInEntry.checkOut.M.till.N)}
        )
    }
}