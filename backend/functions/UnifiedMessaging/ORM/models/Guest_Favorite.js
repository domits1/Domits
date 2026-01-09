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
        isPlaceHolder: {
            type: "boolean",
            nullable: false
        },
        propertyId: {
            type: "varchar",
            nullable: false
        },
        wishlistName: {
            type: "varchar",
            nullable: false
        }
    }
})