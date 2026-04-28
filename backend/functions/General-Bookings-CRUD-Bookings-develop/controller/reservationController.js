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
                headers: responseHeaderJSON,
                message: error.message || "Something went wrong, please contact support."
            }
        }
    }

    // -----------
    // PATCH
    // -----------
    async patch(event) {
        try {
            if (event?.body === undefined || event?.body === null) {
                throw new Error("Missing request body.");
            }
            const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
            const authToken = event?.headers?.Authorization ?? event?.headers?.authorization;

            if (body?.action === "accept-inquiry" || body?.action === "decline-inquiry") {
                if (!body?.bookingId) throw new Error("Missing bookingId.");
                const result = body.action === "accept-inquiry"
                    ? await this.bookingService.acceptInquiry(body.bookingId, authToken)
                    : await this.bookingService.declineInquiry(body.bookingId, authToken);
                return { statusCode: 200, headers: responseHeaderJSON, response: result };
            }

            if (!body?.paymentid) {
                throw new Error("Missing paymentid.");
            }
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
                headers: responseHeaderJSON,
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
                headers: responseHeaderJSON,
                message: error.message || "Something went wrong, please contact support.",
                response: error.response || ""
            }
        }
    }
}
export default ReservationController;
