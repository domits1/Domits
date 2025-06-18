export class Property {

    constructor(baseProperty, amenities, availability, checkIn, details, location, pricing, rules, type, images, technicalDetails) {
        this.property = baseProperty
        this.propertyAmenities = amenities
        this.propertyAvailabilities = availability
        this.propertyCheckIn = checkIn
        this.propertyGeneralDetails = details
        this.propertyLocation = location
        this.propertyPricing = pricing
        this.propertyRules = rules
        this.propertyType = type
        this.propertyImages = images
        this.propertyTechnicalDetails = technicalDetails
    }

}