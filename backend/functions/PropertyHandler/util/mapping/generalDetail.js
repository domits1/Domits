import { PropertyGeneralDetail } from "../../business/model/propertyGeneralDetail.js";

export class GeneralDetailMapping {

    static mapDatabaseEntryToGeneralDetail(generalDetailEntry) {
        return new PropertyGeneralDetail(
            generalDetailEntry.id.S,
            generalDetailEntry.property_id.S,
            generalDetailEntry.detail.S,
            parseFloat(generalDetailEntry.value.N)
        )
    }
}