import { PropertyBaseDetails } from "../../business/model/propertyBaseDetails.js";

export class PropertyBaseInfoMapping {

    static mapDatabaseEntryToPropertyBaseInfo(propertyBaseInfoEntry) {
        return new PropertyBaseDetails({
            id: propertyBaseInfoEntry.id,
            hostId: propertyBaseInfoEntry.hostid,
            title: propertyBaseInfoEntry.title,
            subtitle: propertyBaseInfoEntry.subtitle,
            description: propertyBaseInfoEntry.description,
            registrationNumber: propertyBaseInfoEntry.registrationnumber,
            status: propertyBaseInfoEntry.status,
            createdAt: propertyBaseInfoEntry.createdat,
            updatedAt: propertyBaseInfoEntry.updatedat,
            automatedWelcomeMessage: propertyBaseInfoEntry.automatedwelcomemessage,
            automatedCheckinMessage: propertyBaseInfoEntry.automatedcheckinmessage
        })
    }
}