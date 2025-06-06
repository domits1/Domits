import { PropertyBaseDetails } from "../../business/model/propertyBaseDetails.js";

export class PropertyBaseInfoMapping {

    static mapDatabaseEntryToPropertyBaseInfo(propertyBaseInfoEntry) {
        return new PropertyBaseDetails({
            id: propertyBaseInfoEntry.id.S,
            hostId: propertyBaseInfoEntry.hostId.S,
            title: propertyBaseInfoEntry.title.S,
            subtitle: propertyBaseInfoEntry.subtitle.S,
            description: propertyBaseInfoEntry.description.S,
            guestCapacity: parseFloat(propertyBaseInfoEntry.guestCapacity.N),
            registrationNumber: propertyBaseInfoEntry.registrationNumber.S,
            status: propertyBaseInfoEntry.status.S,
            propertyType: propertyBaseInfoEntry.propertyType.S,
            createdAt: parseFloat(propertyBaseInfoEntry.createdAt.N),
            updatedAt: parseFloat(propertyBaseInfoEntry.updatedAt.N)
        })
    }
}