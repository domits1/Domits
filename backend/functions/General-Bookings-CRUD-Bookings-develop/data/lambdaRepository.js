import NotFoundException from "../util/exception/NotFoundException.js"

class LambdaRepository {
    async getPropertiesFromHostId(host_Id){
        const response = await fetch(
            `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId?hostId=${host_Id}`
        );
        
        const receivedData = await response.json();
        if (receivedData === "No property found."){
            throw new NotFoundException("User has no active properties.");
        }
        const propertyIds = receivedData.map(item => item.property.id) 
        const propertyTitles = receivedData.map(item => item.property.title);
        const propertyRates = receivedData.map(item => item.propertyPricing.roomRate);

        return {
            id : propertyIds,
            title : propertyTitles,
            rate : propertyRates,
        };
    }

    async getPropertyPricingById(property_Id){
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .where("property.id = :id", {id: id})
            .getOne();

        console.log(result);
        if (result) {
            return {
                pricing: result.pricing,
            }
        } else {
            throw new NotFoundException("Property is inactive or does not exist.")
        }
    }
}
export default LambdaRepository;