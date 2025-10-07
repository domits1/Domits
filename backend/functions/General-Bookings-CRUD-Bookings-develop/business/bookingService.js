import GeneralModel from "./model/generalModel.js";
import IdentifierModel from "./model/identifierModel.js";
import GetParamsModel from "./model/getParamsModel.js";
import AuthManager from "../auth/authManager.js";
import sendEmail from './sendEmail.js';
import Forbidden from "../util/exception/Forbidden.js";
import TypeException from "../util/exception/TypeException.js";
import NotFoundException from "../util/exception/NotFoundException.js";
import ReservationRepository from "../data/reservationRepository.js";
import StripeRepository from "../data/stripeRepository.js";
import CognitoRepository from "../data/cognitoRepository.js";
import PropertyRepository from "../data/propertyRepository.js";
import getHostEmailById from './getHostEmailById.js';
import AutomatedMessageService from './automatedMessageService.js';
import SchedulingService from './schedulingService.js';

class BookingService {
	constructor() {
		this.reservationRepository = new ReservationRepository();
		this.stripeRepository = new StripeRepository();
		this.cognitoRepository = new CognitoRepository();
		this.propertyRepository = new PropertyRepository();
		this.authManager = new AuthManager();
		this.getParamsModel = new GetParamsModel();
		this.automatedMessageService = new AutomatedMessageService();
		this.schedulingService = new SchedulingService();
	}

	// -----------
	// /bookings POST
	// -----------

	async create(event) {
		//await this.verifyEventDataTypes(event);
		const authenticatedUser = await this.authManager.authenticateUser(event.Authorization);
		const userEmail = authenticatedUser.email
		const fetchedProperty = await this.propertyRepository.getPropertyById(event.identifiers.property_Id);
		const hostEmail = await getHostEmailById(fetchedProperty.hostId)

		const bookingInfo = {
			guests: event.general.guests,
			propertyName: fetchedProperty.title,
			arriveDate: event.general.arrivalDate,
			departureDate: event.general.departureDate
		};
		await sendEmail(userEmail, hostEmail, bookingInfo);

		// Send automated booking confirmation message to host
		try {
			await this.automatedMessageService.sendBookingConfirmation(
				fetchedProperty.hostId,
				authenticatedUser.sub,
				event.identifiers.property_Id,
				bookingInfo
			);
			console.log('Automated booking confirmation sent to host');
		} catch (error) {
			console.error('Failed to send automated message:', error);
			// Don't fail the booking if automated message fails
		}

		const bookingResult = await this.reservationRepository.addBookingToTable(event, authenticatedUser.sub, fetchedProperty.hostId);

		// Schedule automated messages for the booking
		try {
			const bookingId = bookingResult.id || bookingResult.bookingId;

			// Schedule check-in instructions (immediately for demo purposes)
			this.schedulingService.scheduleCheckInInstructions(
				bookingId,
				fetchedProperty.hostId,
				authenticatedUser.sub,
				event.identifiers.property_Id,
				event.general.arrivalDate,
				bookingInfo
			);

			// Schedule Wi-Fi information (immediately for demo purposes)
			this.schedulingService.scheduleWifiInfo(
				bookingId,
				fetchedProperty.hostId,
				authenticatedUser.sub,
				event.identifiers.property_Id,
				bookingInfo
			);

			// Schedule check-out instructions (immediately for demo purposes)
			this.schedulingService.scheduleCheckOutInstructions(
				bookingId,
				fetchedProperty.hostId,
				authenticatedUser.sub,
				event.identifiers.property_Id,
				event.general.departureDate,
				bookingInfo
			);

			console.log('Automated messages scheduled for booking:', bookingId);
		} catch (error) {
			console.error('Failed to schedule automated messages:', error);
			// Don't fail the booking if scheduling fails
		}

		return bookingResult;

	}

	// -----------
	// /bookings PATCH
	// -----------

	async confirmPayment(paymentid) {
		const booking = await this.reservationRepository.getBookingByPaymentId(paymentid);
		if (booking.status === "Paid") {
			return true;
		}
		const paymentIntent = await this.stripeRepository.getPaymentIntentByPaymentId(paymentid);
		if (paymentIntent.status === "succeeded") {
			await this.reservationRepository.updateBookingStatus(booking.id, "Paid");
			return true;
		} else {
			return false;
		}
	}

	async failPayment(paymentid) {
		const booking = await this.reservationRepository.getBookingByPaymentId(paymentid);
		if (booking.status === "Awaiting Payment") {
			await this.reservationRepository.updateBookingStatus(booking.id, "Failed");
			return true;
		}
	}
	// -----------
	// /bookings GET
	// -----------

	async read(event) {
		let authToken;
		await this.verifyQueryDataTypes(event);
		switch (event.event.readType) {
			case "property": {
				await this.authManager.authenticateUser(event.Authorization);
				return await this.reservationRepository.readByPropertyId(event.event.property_Id);
			}
			case "guest": {
				authToken = await this.authManager.authenticateUser(event.Authorization);
				return await this.reservationRepository.readByGuestId(authToken.sub);
			}

			case "createdAt": {
				return await this.reservationRepository.readByDate(event.event.createdAt, event.event.property_Id);
			}
			case "paymentId": {
				await this.authManager.authenticateUser(event.Authorization);
				return await this.reservationRepository.readByPaymentId(event.event.paymentID);
			}
			case "hostId": {
				authToken = await this.authManager.authenticateUser(event.Authorization);
				return await this.reservationRepository.readByHostId(authToken.sub);
			}
			case "departureDate": {
				return await this.reservationRepository.readByDepartureDate(event.event.departureDate, event.event.property_Id);
			}
			case "getId": {
				authToken = await this.authManager.authenticateUser(event.Authorization);
				return {
					response: authToken.sub
				}
			}
			case "getPayment":
				{
					const user = await this.authManager.authenticateUser(event.Authorization);
					const booking = await this.reservationRepository.getBookingById(event.event.bookingId);
					if (booking.guestId !== user.sub) {
						throw new Forbidden("Only the guest of this booking may view payment information.")
					}
					const payment = await this.stripeRepository.getPaymentByBookingId(event.event.bookingId);
					return {
						statusCode: 200,
						response: payment.stripeClientSecret
					}
				}
			default:
				{
					throw new TypeException("Unable to determine what read type to use.");
				}
		}
	}


	// -----------
	// verify Booking POST request
	// -----------

	async verifyEventDataTypes(event) {
		try {
			if (event?.identifiers && event?.tax && event?.general) {
				IdentifierModel.verifyIdentifierData(event);
				GeneralModel.verifyGeneralData(event);
			}
		} catch (error) {
			console.error(error);
			throw new Forbidden("Unable to verify data! Check your request or contact support!");
		}
	}

	// -----------
	// verify Booking GET request
	// -----------

	async verifyQueryDataTypes(params) {
		try {
			//await this.getParamsModel.verifyGetParams(params);
		} catch (error) {
			console.error(error);
			throw new Forbidden("Unable to verify data! Check your request or contact support!");
		}
	}
}


export default BookingService;