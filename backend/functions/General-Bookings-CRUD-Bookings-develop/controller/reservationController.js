import BookingService from "../business/bookingService.js"
import PaymentService from "../business/paymentService.js"

import responsejson from "../util/const/responseheader.json" with { type: 'json' };
const responseHeaderJSON = responsejson

class ReservationController {

    constructor() {
        this.bookingService = new BookingService();
        this.paymentSerivce = new PaymentService();
    }
    // -----------
    // POST
    // -----------

    async create(event){
        try{ 
           const returnInfo = await this.bookingService.create(event.event);
           const paymentData = await this.paymentSerivce.create(returnInfo.hostId, returnInfo.bookingId, returnInfo.propertyId, returnInfo.dates);
            return {
                statusCode: returnInfo.statusCode,
                headers: responseHeaderJSON,
                response: paymentData,
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                message: error.message || "Something went wrong, please contact support."
            }
        }
    }

    // -----------
    // PATCH
    // -----------
    async patch(event) {
        try {
            const body = JSON.parse(event.body);
            let confirmed;
            if (body?.failedpayment){
                confirmed = await this.bookingService.failPayment(body.paymentid);
            }
            else {
                confirmed = await this.bookingService.confirmPayment(body.paymentid);
            }
            return {
                statusCode: 200,
                headers: responseHeaderJSON,
                response: {
                    paymentConfirmed: confirmed
                }
            }
        } catch (error) {
            console.error(error)
            return {
                statusCode: error.statusCode || 500,
                response: error.message || "Something went wrong, please contact support."
            }
        }
    }

    // -----------
    // GET    
    // -----------

    async read(event){
        try { 
            const returnInfo = await this.bookingService.read(event);
            return {
                statusCode: returnInfo.statusCode || 209,
                headers: responseHeaderJSON,
                response: returnInfo.response,
            }
        } catch (error) {
            console.error(error)
            return {
                statusCode: error.statusCode || 500,
                message: error.message || "Something went wrong, please contact support.",
                response: error.response || ""
            }
        }
    }

    // -----------
    // DELETE    
    // -----------

    async delete(event) {
        try {
            const authToken = event.headers.Authorization;
            const body = JSON.parse(event.body);
            const bookingId = body.bookingId;

            if (!bookingId) {
                return {
                    statusCode: 400,
                    headers: responseHeaderJSON,
                    response: {
                        message: "bookingId is required in request body"
                    }
                }
            }

            await this.bookingService.delete(bookingId, authToken);
            return {
                statusCode: 204,
                headers: responseHeaderJSON
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaderJSON,
                response: {
                    message: error.message || "Something went wrong, please contact support."
                }
            }
        }
    }
}
export default ReservationController;