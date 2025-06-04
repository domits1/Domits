export class ImageMapping {

    static mapDatabaseEntryToImage(imageEntry) {
        return {
            property_id: imageEntry.property_id.S,
            key: imageEntry.key.S
        }
    }
}