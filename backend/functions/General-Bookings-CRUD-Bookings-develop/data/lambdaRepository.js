import NotFoundException from "../util/exception/NotFoundException.js"
import Database from "database";
import { Property_Pricing } from "database/models/Property_Pricing";
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

    async getPropertyPricingById(id){
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Pricing)
            .createQueryBuilder("property_pricing")
            .where("property_pricing.property_id = :id", {id: id})
            .getOne();

        if (result.roomrate || result.cleaning) {
            client.close();
            return {
                pricing: result,
            }
        } else {
            throw new NotFoundException("Property is inactive or does not exist.")
        }
    }
}
export default LambdaRepository;