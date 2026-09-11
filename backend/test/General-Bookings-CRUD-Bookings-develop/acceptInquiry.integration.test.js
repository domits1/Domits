import { randomUUID } from "node:crypto";
import Database from "database";
import { Booking } from "database/models/Booking";
import ReservationRepository from "../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js";

// Manual test against the real Aurora DSQL cluster. Opt in with RUN_DSQL_INTEGRATION_TESTS=true
// and AWS credentials that can read the /aurora/dsql/* SSM parameters and call dsql:DbConnectAdmin.
const skipIntegrationTests = !process.env.RUN_DSQL_INTEGRATION_TESTS;
const RACE_ITERATIONS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

jest.setTimeout(60_000);

(skipIntegrationTests ? describe.skip : describe)("acceptInquiry concurrency against Aurora DSQL - Manual Test", () => {
  const repository = new ReservationRepository();
  const seededIds = [];

  beforeAll(() => {
    // The ORM only targets the `test` schema when TEST=true; without it this would write to `main`.
    if (process.env.TEST !== "true") {
      throw new Error("Refusing to run: TEST=true is required so the ORM targets the test schema.");
    }
  });

  afterAll(async () => {
    const client = await Database.getInstance();
    if (seededIds.length > 0) {
      await client.createQueryBuilder().delete().from(Booking).where("id IN (:...ids)", { ids: seededIds }).execute();
    }
    await client.destroy();
  });

  const seedInquiry = async (client, { propertyId, arrivalDateMs, departureDateMs }) => {
    const id = randomUUID();
    await client
      .createQueryBuilder()
      .insert()
      .into(Booking)
      .values({
        id,
        arrivaldate: arrivalDateMs,
        departuredate: departureDateMs,
        createdat: Date.now(),
        guestid: "integration-guest",
        guests: 1,
        hostid: "integration-host",
        latepayment: false,
        paymentid: "integration-none",
        property_id: propertyId,
        status: "Inquiry",
        guestname: "Integration Guest",
        hostname: "Integration Host",
      })
      .execute();
    seededIds.push(id);
    return id;
  };

  const readStatuses = async (client, ids) => {
    const rows = await client
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .select(["booking.id", "booking.status"])
      .where("booking.id IN (:...ids)", { ids })
      .getMany();
    return rows.map((row) => row.status).sort();
  };

  const describeOutcome = (outcome) => {
    if (outcome.status === "fulfilled") return `accepted=${outcome.value.accepted}`;
    const reason = outcome.reason;
    return `rejected: ${reason?.message} {name=${reason?.name} code=${reason?.code} driverCode=${reason?.driverError?.code}}`;
  };

  it.each(Array.from({ length: RACE_ITERATIONS }, (_, index) => index + 1))(
    "race %i: two overlapping inquiries accepted concurrently leave exactly one Awaiting Payment",
    async () => {
      const client = await Database.getInstance();
      const propertyId = `integration-accept-inquiry-${randomUUID()}`;
      const base = Date.UTC(2030, 0, 1);
      const first = { arrivalDateMs: base + 10 * DAY_MS, departureDateMs: base + 14 * DAY_MS };
      const second = { arrivalDateMs: base + 12 * DAY_MS, departureDateMs: base + 16 * DAY_MS };

      const firstId = await seedInquiry(client, { propertyId, ...first });
      const secondId = await seedInquiry(client, { propertyId, ...second });

      const outcomes = await Promise.allSettled([
        repository.acceptInquiryWithOverlapDecline({ bookingId: firstId, propertyId, ...first }),
        repository.acceptInquiryWithOverlapDecline({ bookingId: secondId, propertyId, ...second }),
      ]);

      console.log(`race outcomes: [${outcomes.map(describeOutcome).join(" | ")}]`);

      // The DSQL conflict (40001) must be absorbed by the retry, never surfaced to the caller:
      // the loser has to come back as a clean accepted=false so the host gets a 400, not a 500.
      expect(outcomes.map((outcome) => outcome.status)).toEqual(["fulfilled", "fulfilled"]);
      expect(outcomes.map((outcome) => outcome.value.accepted).sort()).toEqual([false, true]);
      expect(await readStatuses(client, [firstId, secondId])).toEqual(["Awaiting Payment", "Declined"]);
    }
  );
});
