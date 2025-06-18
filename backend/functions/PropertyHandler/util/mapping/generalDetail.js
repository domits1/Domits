import { PropertyGeneralDetail } from "../../business/model/propertyGeneralDetail.js";

export class GeneralDetailMapping {

    static mapDatabaseEntryToGeneralDetail(generalDetailEntry) {
        return new PropertyGeneralDetail(
            generalDetailEntry.id,
            generalDetailEntry.property_id,
            generalDetailEntry.detail,
            generalDetailEntry.value
        )
    }
}