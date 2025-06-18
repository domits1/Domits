class IdentifierModel{
       static verifyIdentifierData(event){
            if (typeof event.identifiers.property_Id !== 'string'){
                throw new Error("Invalid type for property_Id, expected an string but received an", typeof(event.identifiers.property_Id));
            }
            if (typeof event.identifiers.payment_Id !== 'string'){
                throw new Error("Invalid type for payment_Id, expected an string but received an", typeof(event.identifiers.payment_Id));
            }
        }
}
export default IdentifierModel;
