import {EntitySchema} from "typeorm";

export const Property_Technical_Details = new EntitySchema({
    name: "Property_TechnicalDetails",
    tableName: "property_technicaldetails",
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            generated: false,
            nullable: false
        },
        fourWheelDrive: {
            type: "boolean",
            nullable: false
        },
        fuelConsumption: {
            type: "int",
            nullable: false
        },
        generalPeriodicInspection: {
            type: "int",
            nullable: false
        },
        height: {
            type: "int",
            nullable: true
        },
        length: {
            type: "int",
            nullable: false
        },
        renovationYear: {
            type: "int",
            nullable: false
        },
        speed: {
            type: "int",
            nullable: false
        },
        transmission: {
            type: "varchar",
            nullable: false
        }
    }
})