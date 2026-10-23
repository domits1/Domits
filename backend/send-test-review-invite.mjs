import Database from "database";
import { ReviewRequestNotifier } from "./functions/ReviewSystem/business/service/reviewRequestNotifier.js";

const bookingId = "b3000000-0000-4000-8000-000000000001";

const db = await Database.getInstance();
const booking = await db.query(
  "SELECT * FROM main.booking WHERE id = $1",
  [bookingId]
);

if (booking.length !== 1) {
  throw new Error("Test booking not found");
}

if (booking[0].guest_email !== "puokkamlerruai@gmail.com") {
  throw new Error("Unexpected test recipient");
}

console.log("Sending invitation for:", bookingId);

const notifier = new ReviewRequestNotifier();
await notifier.send(booking[0]);

console.log("Review invitation sent successfully");
