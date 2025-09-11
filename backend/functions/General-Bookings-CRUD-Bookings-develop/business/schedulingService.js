import AutomatedMessageService from './automatedMessageService.js';

class SchedulingService {
    constructor() {
        this.automatedMessageService = new AutomatedMessageService();
        this.scheduledTasks = new Map();
    }

    // Schedule a message to be sent at a specific time
    scheduleMessage(messageData, delayMs) {
        const { id, hostId, guestId, propertyId, messageType, bookingInfo } = messageData;

        // Cancel existing task if it exists
        if (this.scheduledTasks.has(id)) {
            clearTimeout(this.scheduledTasks.get(id));
        }

        const taskId = setTimeout(async () => {
            try {
                console.log(`Sending scheduled ${messageType} message for booking ${id}`);

                switch (messageType) {
                    case 'checkin_instructions':
                        await this.automatedMessageService.sendCheckInInstructions(hostId, guestId, propertyId, bookingInfo);
                        break;
                    case 'checkout_instructions':
                        await this.automatedMessageService.sendCheckOutInstructions(hostId, guestId, propertyId, bookingInfo);
                        break;
                    case 'reminder':
                        await this.automatedMessageService.sendReminder(hostId, guestId, propertyId, bookingInfo);
                        break;
                    case 'feedback_request':
                        await this.automatedMessageService.sendFeedbackRequest(hostId, guestId, propertyId, bookingInfo);
                        break;
                    case 'wifi_info':
                        await this.automatedMessageService.sendWifiInfo(hostId, guestId, propertyId, bookingInfo);
                        break;
                    default:
                        console.warn(`Unknown message type: ${messageType}`);
                }

                // Remove task from map after completion
                this.scheduledTasks.delete(id);
                console.log(`Scheduled ${messageType} message sent for booking ${id}`);

            } catch (error) {
                console.error(`Failed to send scheduled ${messageType} message:`, error);
                // Remove failed task from map
                this.scheduledTasks.delete(id);
            }
        }, delayMs);

        this.scheduledTasks.set(id, taskId);
        console.log(`Scheduled ${messageType} message for booking ${id} in ${delayMs}ms`);
    }

    // Schedule check-in instructions (immediately for demo purposes)
    scheduleCheckInInstructions(bookingId, hostId, guestId, propertyId, checkInDate, bookingInfo) {
        // Send immediately (delay of 2 seconds for demo purposes)
        this.scheduleMessage({
            id: `${bookingId}_checkin`,
            hostId,
            guestId,
            propertyId,
            messageType: 'checkin_instructions',
            bookingInfo
        }, 2000); // 2 second delay
    }

    // Schedule check-out instructions (immediately for demo purposes)
    scheduleCheckOutInstructions(bookingId, hostId, guestId, propertyId, checkOutDate, bookingInfo) {
        // Send immediately (delay of 3 seconds for demo purposes)
        this.scheduleMessage({
            id: `${bookingId}_checkout`,
            hostId,
            guestId,
            propertyId,
            messageType: 'checkout_instructions',
            bookingInfo
        }, 3000); // 3 second delay
    }

    // Schedule reminder (1 week before check-in)
    scheduleReminder(bookingId, hostId, guestId, propertyId, checkInDate, bookingInfo) {
        const checkInTime = new Date(checkInDate);
        const oneWeekBefore = new Date(checkInTime.getTime() - (7 * 24 * 60 * 60 * 1000));
        const now = new Date();
        const delay = oneWeekBefore.getTime() - now.getTime();

        if (delay > 0) {
            this.scheduleMessage({
                id: `${bookingId}_reminder`,
                hostId,
                guestId,
                propertyId,
                messageType: 'reminder',
                bookingInfo
            }, delay);
        }
    }

    // Schedule Wi-Fi information (immediately for demo)
    scheduleWifiInfo(bookingId, hostId, guestId, propertyId, bookingInfo) {
        // Send immediately (delay of 1 second for demo purposes)
        this.scheduleMessage({
            id: `${bookingId}_wifi`,
            hostId,
            guestId,
            propertyId,
            messageType: 'wifi_info',
            bookingInfo
        }, 1000); // 1 second delay
    }

    // Schedule feedback request (24 hours after check-out)
    scheduleFeedbackRequest(bookingId, hostId, guestId, propertyId, checkOutDate, bookingInfo) {
        const checkOutTime = new Date(checkOutDate);
        const twentyFourHoursAfter = new Date(checkOutTime.getTime() + (24 * 60 * 60 * 1000));
        const now = new Date();
        const delay = twentyFourHoursAfter.getTime() - now.getTime();

        if (delay > 0) {
            this.scheduleMessage({
                id: `${bookingId}_feedback`,
                hostId,
                guestId,
                propertyId,
                messageType: 'feedback_request',
                bookingInfo
            }, delay);
        }
    }

    // Cancel all scheduled messages for a booking
    cancelBookingMessages(bookingId) {
        const messageTypes = ['_checkin', '_checkout', '_reminder', '_feedback', '_wifi'];
        messageTypes.forEach(type => {
            const taskId = `${bookingId}${type}`;
            if (this.scheduledTasks.has(taskId)) {
                clearTimeout(this.scheduledTasks.get(taskId));
                this.scheduledTasks.delete(taskId);
                console.log(`Cancelled scheduled message: ${taskId}`);
            }
        });
    }

    // Get scheduled tasks (for debugging/monitoring)
    getScheduledTasks() {
        return Array.from(this.scheduledTasks.keys());
    }
}

export default SchedulingService;
