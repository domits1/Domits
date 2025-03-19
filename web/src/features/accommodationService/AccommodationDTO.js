class propertyDTO{
    constructor(data){
        this.title = data.title;
        this.description = data.description;
        this.guestCapicity = dataguestCapicity;
        this.registerNumber = data.registerNumber;
        this.status = data.status;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
}

class propertyAmenitiesDTO{
    constructor(data){
        this.amenityID = data.amenityID;
    }
}
class propertyAvailability{
    constructor(data){
        this.availableStartDate = data.availableStartDate;
        this.availableEndDate = data.availableEndDate;
    }
}
class propertyAvailabilityRestrictions{
    constructor(data){
        this.restriction = data.restriction;
        this.value = data.value;
    }
}


export default propertyDTO;
