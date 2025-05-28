import TypeException from "../../util/exception/TypeException"

class BookingModel {
    id;
    arrivalDate;
    createdAt;
    departureDate;
    guestId;
    guests;
    hostId;
    latePayment;
    paymentId;
    property_id;
    status;

    constructor(params) {
        this._property_id = params.identifiers.property_id;
        this._guests = params.general.guests;
        this._arrivalDate = params.general.arrivalDate;
        this._departureDate = params.general.departureDate;
    }

    set _id(id) { //generate UUID
        if (typeof id !== "string") {
            throw new TypeException("BookingService - ID must be a string");
        }
        this.id = id;
    }

    set _arrivalDate(arrivalDate) { // check if date does not conflict with current bookings (extra check)
        if (typeof arrivalDate !== "number") {
            throw new TypeException("BookingService - arrivalDate must be a number.")
        }
        this.arrivalDate = arrivalDate;
    }

    set _createdAt(createdAt) { 
        if (typeof createdAt !== "number"){
            throw new TypeException("BookingService - createdAt must be a number.")
        }
        this.createdAt = createdAt;
    }

    set _departureDate(departureDate) { // check for no conflicts with existing times before reserving
        if (typeof departureDate !== "number"){
            throw new TypeException("BookingService - departureDate must be a number.")
        }
        this.departureDate = departureDate;
    }

    set _guestId(guestId) { // validated from cognito, comes from accesstoken
        if (typeof createdAt !== "string"){
            throw new TypeException("BookingService - guestId must be a string.")
        }
        this.guestId = guestId;
    }

    set _hostId(host_Id) { // also 100% validated
        if (typeof host_Id !== "string"){
            throw new TypeException("BookingService - hostId must be a string.")
        }
        this.hostId = hostId;
    }

    set _latePayment(latePayment) { // to be extended on later
        if (typeof latePayment !== "bool"){
            throw new TypeException("BookingService - latePayment must be a bool.")
        }
        this.latePayment = latePayment;
    }

    set _paymentId(payment_Id) { //data from stripe after checkout
        if (typeof paymentId !== "string"){
            throw new TypeException("BookingService - paymentId must be a string.")
        }
        this.paymentId = this.paymentId;
    }

    set _property_id(property_id) { //check if property_id is valid
        if (typeof property_id !== "string"){
            throw new TypeException("BookingService - property_id must be a string.")
        }
        this.property_id = property_id;
    }

    set status(status) { //decided by Stripe
        if (typeof status !== "string"){
            throw new TypeException("BookingService - status must be a string.")
        }
        this.status = status;
    }
}
export default BookingModel;