import BookingService from "../business/bookingService.mjs"
import PaymentService from "../business/paymentService.mjs"

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
           const paymentData = await this.paymentSerivce.create(returnInfo.hostId, returnInfo.bookingId);
            return {
                statusCode: returnInfo.statusCode,
                headers: responseHeaderJSON,
                response: paymentData,
            }
        } catch (error) {
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
            const bookingId = body.bookingId;
            const confirmed = await this.bookingService.confirmPayment(bookingId)
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
}
export default ReservationController;