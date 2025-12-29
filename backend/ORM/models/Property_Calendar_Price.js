import {EntitySchema} from "typeorm";
export const Property_Calendar_Price = new EntitySchema({
    name: "Property_Calendar_Price",
    tableName: "property_calendar_price",
    schema: "public",
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            length: 255,
            nullable: false
        },
        date: {
            primary: true,
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false,
            comment: "Unix timestamp in milliseconds"
        },
        price: {
            type: "int",
            nullable: false,
            comment: "Price in cents (e.g., 15000 = $150.00)"
        }
    }
});
