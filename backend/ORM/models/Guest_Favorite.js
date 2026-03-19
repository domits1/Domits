import {EntitySchema} from "typeorm";

export const Guest_Favorite = new EntitySchema({
    name: "Guest_Favorite",
    schema: "main",
    tableName: "guest_favorite",
    columns: {
        guestId: {
            name: "guestid",
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        wishlistKey: {
            name: "wishlistkey",
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        isPlaceholder: {
            name: "isplaceholder",
            type: "boolean",
            nullable: false
        },
        propertyId: {
            name: "propertyid",
            type: "varchar",
            nullable: true
        },
        wishlistName: {
            name: "wishlistname",
            type: "varchar",
            nullable: false
        }
    }
})
