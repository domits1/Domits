import { PropertyType } from "../../business/model/propertyType.js";

export class TypeMapping {

    static mapDatabaseEntryToType(typeEntry) {
        return new PropertyType({
            property_id: typeEntry.property_id,
            property_type: typeEntry.type,
            spaceType: typeEntry.spacetype
        })
    }
}