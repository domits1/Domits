import NotFoundException from "../util/exception/NotFoundException.mjs"

class LambdaRepository {
    async getPropertiesFromHostId(host_Id){
        const response = await fetch(
            `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId?hostId=${host_Id}`
        );
        
        const receivedData = await response.json();
        if (receivedData === "No property found."){
            throw new NotFoundException("User has no properties available");
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
}
export default LambdaRepository;