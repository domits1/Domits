class GeneralModel{
   static verifyGeneralData(event){
        if (typeof event.general.guests !== 'number'){
            throw new Error("Invalid type for guests, expected an number but received an", typeof(event.general.guests));
        }
        if (typeof event.general.latePayment !== 'boolean'){
            throw new Error("Invalid type for latePayment, expected an string but received an", typeof(event.general.latePayment));
        }
        if (typeof event.general.status !== 'string'){
            throw new Error("Invalid type for status, expected an string but received an", typeof(event.general.status));
        }
        if (typeof event.general.arrivalDate !== 'number'){
            throw new Error("Invalid type for arrivalDate, expected an number but received an", typeof(event.general.arrivalDate));
        }
        if (typeof event.general.departureDate !== 'number'){
            throw new Error("Invalid type for departureDate, expected an number but received an", typeof(event.general.departureDate));
        }
    }
}
export default GeneralModel;
