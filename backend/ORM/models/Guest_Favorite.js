import {EntitySchema} from "typeorm";

export const Guest_Favorite = new EntitySchema({
    name: "Guest_Favorite",
    tableName: "guest_favorite",
    columns: {
        guestId: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        wishlistKey: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        isPlaceholder: {
            type: "boolean",
            nullable: false
        },
        propertyId: {
            type: "varchar",
            nullable: true
        },
        wishlistName: {
            type: "varchar",
            nullable: false
        }
    }
})