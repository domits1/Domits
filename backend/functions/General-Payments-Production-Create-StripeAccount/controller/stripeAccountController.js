import responsejson from "../util/constant/responseheader.json" with { type: 'json' };
import StripeAccountService from "../business/service/stripeAccountService.js";
const responseHeaderJSON = responsejson

class StripeAccountController {

    constructor() {
        this.stripeAccountService = new StripeAccountService();
    }


    // -----------
    // POST
    // -----------

    async create(event){
        try {

            const body = JSON.parse(event.body);
            const response = await this.stripeAccountService.createStripeAccount(body);

            return {
                statusCode: 200,
                headers: responseHeaderJSON,
                response: {
                    message: response.message,
                    url: response.url,
                    details: response.details
                },
            };
        } catch (error) {
            console.error(error);
            return {
                statusCode: 500,
                headers: responseHeaderJSON,
                message: error.message || "Something went wrong, please contact support."
            }

        }
    }

}
export default StripeAccountController;