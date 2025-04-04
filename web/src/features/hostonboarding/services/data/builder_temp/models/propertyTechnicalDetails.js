
export class PropertyTechnicalDetails {
    property_id;
    length;
    height;
    fuelConsumption;
    speed;
    renovationYear;
    transmission;
    generalPeriodicInspection;
    fourWheelDrive;

    /**
     *
     *        property_id;
     *        length
     *        height
     *        fuelConsumption
     *        speed
     *        renovationYear
     *        transmission
     *        generalPeriodicInspection
     *        fourWheelDrive
     * @param params
     */
    constructor(params) {
        this._property_id = params.property_id;
        this._length = params.length;
        this._height = params.height;
        this._fuelConsumption = params.fuelConsumption;
        this._speed = params.speed;
        this._renovationYear = params.renovationYear;
        this._transmission = params.transmission;
        this._generalPeriodicInspection = params.generalPeriodicInspection;
        this._fourWheelDrive = params.fourWheelDrive;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyTechnicalDetails - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _length(value) {
        if (typeof value !== "number") {
            throw new Error("propertyTechnicalDetails - Length must be a number.")
        }
        this.length = value;
    }

    set _height(value) {
        if (typeof value !== "number") {
            throw new Error("propertyTechnicalDetails - Height must be a number.")
        }
        this.height = value;
    }

    set _fuelConsumption(value) {
        if (typeof value !== "number") {
            throw new Error("propertyTechnicalDetails - Fuel consumption must be a number.")
        }
        this.fuelConsumption = value;
    }

    set _speed(value) {
        if (typeof value !== "number") {
            throw new Error("propertyTechnicalDetails - Speed must be a number.")
        }
        this.speed = value;
    }

    set _renovationYear(value) {
        if (typeof value !== "number") {
            throw new Error("propertyTechnicalDetails - Renovation year must be a number.")
        }
        this.renovationYear = value;
    }

    set _transmission(value) {
        if (typeof value !== "string") {
            throw new Error("propertyTechnicalDetails - Transmission must be a string.")
        }
        this.transmission = value;
    }

    set _generalPeriodicInspection(value) {
        if (typeof value !== "number") {
            throw new Error("propertyTechnicalDetails - General periodic inspection must be a number.")
        }
        this.generalPeriodicInspection = value;
    }

    set _fourWheelDrive(value) {
        if (typeof value !== "boolean") {
            throw new Error("propertyTechnicalDetails - Four wheel drive must be a boolean.")
        }
        this.fourWheelDrive = value;
    }
}