const mockLambdaSend = jest.fn();
const mockGetDatabaseInstance = jest.fn();
const mockTeamMemberFind = jest.fn();
const mockTeamMemberGetRepository = jest.fn();

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: mockGetDatabaseInstance },
}));
jest.mock("database/models/Team_Member", () => ({ Team_Member: "Team_Member" }));
jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn().mockImplementation(() => ({ send: mockLambdaSend })),
  InvokeCommand: jest.fn().mockImplementation((input) => input),
}));

const ReservationController =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/controller/reservationController.js").default;
const FinanceNotificationService =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/business/financeNotificationService.js").default;
const FinanceNotificationRepository =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/data/financeNotificationRepository.js").default;
const { sendFinanceNotification } =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/business/financeNotificationService.js");

const originalNodeEnv = process.env.NODE_ENV;
const originalAdminEmails = process.env.DOMITS_FINANCE_ADMIN_EMAILS;

const buildBooking = (overrides = {}) => ({
  id: "booking-1",
  guestid: "guest-1",
  hostid: "host-1",
  property_id: "property-1",
  paymentid: "pi-1",
  status: "Awaiting Payment",
  cancellation_policy: "flexible",
  total_price: 100,
  arrivaldate: new Date(Date.now() + 26 * 60 * 60 * 1000),
  departuredate: new Date(Date.now() + 50 * 60 * 60 * 1000),
  ...overrides,
});

const buildController = (booking = buildBooking()) => {
  const notificationSender = jest.fn().mockResolvedValue(undefined);
  const stripe = {
    paymentIntents: {
      retrieve: jest.fn().mockResolvedValue({
        id: booking.paymentid,
        currency: "eur",
        status: "succeeded",
      }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: "re-1",
        amount: 10000,
        status: "succeeded",
      }),
    },
  };
    const notificationContext = {
      hostId: booking.hostid,
      bookingId: booking.id,
      propertyId: booking.property_id,
      paymentId: booking.paymentid,
    };
    const bookingService = {
    reservationRepository: {
      getBookingByPaymentId: jest.fn().mockResolvedValue(booking),
      getBookingById: jest.fn().mockResolvedValue({ response: booking }),
      cancelBookingByGuest: jest.fn().mockResolvedValue({
        response: { id: booking.id, status: "Cancelled" },
        statusCode: 200,
      }),
      recordGuestRefund: jest.fn().mockResolvedValue({
        response: { id: booking.id, status: "Cancelled" },
        statusCode: 200,
      }),
    },
    getPaymentNotificationContext: jest.fn().mockResolvedValue(booking),
    confirmPayment: jest.fn().mockResolvedValue({
      paymentConfirmed: true,
      newlyPaid: booking.status !== "Paid",
      notificationContext,
    }),
    failPayment: jest.fn().mockResolvedValue({
      paymentConfirmed: true,
      paymentFailed: true,
      notificationContext,
    }),
    authManager: {
      authenticateUser: jest.fn().mockResolvedValue({ sub: booking.guestid }),
    },
    getStripeClient: jest.fn().mockResolvedValue(stripe),
    priceLabsBookingNotifier: {
      notifyBookingChange: jest.fn().mockResolvedValue(undefined),
    },
  };
  const controller = new ReservationController({
    bookingService,
    financeNotificationSender: notificationSender,
  });
  return { controller, bookingService, notificationSender, stripe, booking };
};

describe("Finance notification delivery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLambdaSend.mockResolvedValue({});
    mockGetDatabaseInstance.mockReset();
    mockTeamMemberFind.mockReset();
    mockTeamMemberGetRepository.mockReset();
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalAdminEmails === undefined) {
      delete process.env.DOMITS_FINANCE_ADMIN_EMAILS;
    } else {
      process.env.DOMITS_FINANCE_ADMIN_EMAILS = originalAdminEmails;
    }
  });

  test("notifies finance when a payment is received", async () => {
    const { controller, notificationSender, booking } = buildController();

    await controller.handlePaymentPatch({ paymentid: booking.paymentid });

    expect(notificationSender).toHaveBeenCalledWith("GUEST_PAYMENT_RECEIVED", {
      hostId: booking.hostid,
      bookingId: booking.id,
      propertyId: booking.property_id,
      paymentId: booking.paymentid,
    });
  });

  test("continues payment confirmation when notification context is unavailable", async () => {
    const { controller, bookingService, notificationSender, booking } = buildController();
    bookingService.confirmPayment.mockResolvedValue({
      paymentConfirmed: true,
      newlyPaid: true,
      notificationContext: null,
    });

    const result = await controller.handlePaymentPatch({ paymentid: booking.paymentid });

    expect(result).toEqual(expect.objectContaining({
      statusCode: 200,
      response: { paymentConfirmed: true },
    }));
    expect(notificationSender).not.toHaveBeenCalled();
  });

  test("waits for finance notification dispatch before confirming payment", async () => {
    const { controller, notificationSender, booking } = buildController();
    let resolveNotification;
    let notificationStarted;
    const notificationStartedPromise = new Promise((resolve) => {
      notificationStarted = resolve;
    });
    notificationSender.mockImplementation(() => new Promise((resolve) => {
      resolveNotification = resolve;
      notificationStarted();
    }));
    let responseReturned = false;
    const resultPromise = controller.handlePaymentPatch({ paymentid: booking.paymentid }).then((result) => {
      responseReturned = true;
      return result;
    });

    await notificationStartedPromise;
    await new Promise((resolve) => setImmediate(resolve));
    const returnedBeforeNotificationCompleted = responseReturned;
    resolveNotification();

    const result = await resultPromise;
    expect(returnedBeforeNotificationCompleted).toBe(false);
    expect(result.response.paymentConfirmed).toBe(true);
    expect(notificationSender).toHaveBeenCalledWith("GUEST_PAYMENT_RECEIVED", {
      hostId: booking.hostid,
      bookingId: booking.id,
      propertyId: booking.property_id,
      paymentId: booking.paymentid,
    });
  });

  test("notifies finance when a payment fails", async () => {
    const { controller, bookingService, notificationSender, booking } = buildController();

    await controller.handlePaymentPatch({
      paymentid: booking.paymentid,
      failedpayment: true,
    });

    expect(bookingService.failPayment).toHaveBeenCalledWith(booking.paymentid);
    expect(bookingService.confirmPayment).not.toHaveBeenCalled();
    expect(notificationSender).toHaveBeenCalledWith("PAYMENT_FAILED", {
      hostId: booking.hostid,
      bookingId: booking.id,
      propertyId: booking.property_id,
      paymentId: booking.paymentid,
    });
  });

  test("does not send another payment received notification for an already-paid booking", async () => {
    const booking = buildBooking({ status: "Paid" });
    const { controller, notificationSender } = buildController(booking);

    await controller.handlePaymentPatch({ paymentid: booking.paymentid });

    expect(notificationSender).not.toHaveBeenCalled();
  });

  test("sends initiated and completed notifications for a successful refund", async () => {
    const { controller, notificationSender, booking } = buildController();

    await controller.cancelBooking(booking.id, {
      headers: { Authorization: "Bearer test-token" },
    });

    expect(notificationSender).toHaveBeenNthCalledWith(
      1,
      "REFUND_INITIATED",
      expect.objectContaining({
        hostId: booking.hostid,
        bookingId: booking.id,
        propertyId: booking.property_id,
        paymentId: booking.paymentid,
        refundId: "re-1",
      })
    );
    expect(notificationSender).toHaveBeenNthCalledWith(
      2,
      "REFUND_COMPLETED",
      expect.objectContaining({
        hostId: booking.hostid,
        bookingId: booking.id,
        propertyId: booking.property_id,
        paymentId: booking.paymentid,
        refundId: "re-1",
      })
    );
  });


  test("resolves finance and manager roles without including unrelated roles", async () => {
    const repository = {
      getActiveTeamMembers: jest.fn().mockResolvedValue([
        { role: "Financial Manager", member_email: "finance@example.com" },
        { role: "General Manager", member_email: "general@example.com" },
        { role: "Revenue Manager", member_email: "revenue@example.com" },
        { role: "Team Member", member_email: "other@example.com" },
      ]),
    };
    const service = new FinanceNotificationService({
      financeNotificationRepository: repository,
      getHostEmailByIdFn: jest.fn(),
      lambdaClient: { send: mockLambdaSend },
    });

    const recipients = await service.resolveRecipients("host-1", ["FINANCE", "MANAGER"]);

    expect(repository.getActiveTeamMembers).toHaveBeenCalledWith("host-1");
    expect(recipients).toEqual([
      "finance@example.com",
      "general@example.com",
      "revenue@example.com",
    ]);
  });

  test("queries only active team members for the requested host", async () => {
    const dataSource = { getRepository: mockTeamMemberGetRepository };
    mockGetDatabaseInstance.mockResolvedValue(dataSource);
    mockTeamMemberGetRepository.mockReturnValue({ find: mockTeamMemberFind });
    mockTeamMemberFind.mockResolvedValue([]);

    const repository = new FinanceNotificationRepository();
    await repository.getActiveTeamMembers("host-1");

    expect(mockGetDatabaseInstance).toHaveBeenCalledTimes(1);
    expect(mockTeamMemberGetRepository).toHaveBeenCalledWith("Team_Member");
    expect(mockTeamMemberFind).toHaveBeenCalledWith({
      where: { host_id: "host-1", status: "active" },
    });
  });

  test("keeps notification lookup failures from rejecting the sender", async () => {
    const repository = { getActiveTeamMembers: jest.fn().mockRejectedValue(new Error("Lookup failed")) };
    const service = new FinanceNotificationService({
      financeNotificationRepository: repository,
      getHostEmailByIdFn: jest.fn(),
      lambdaClient: { send: mockLambdaSend },
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(service.send("PAYMENT_FAILED", { hostId: "host-1" })).resolves.toBeUndefined();
      expect(repository.getActiveTeamMembers).toHaveBeenCalledWith("host-1");
      expect(mockLambdaSend).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  test("keeps failed Lambda sends from rejecting the sender", async () => {
    process.env.DOMITS_FINANCE_ADMIN_EMAILS = "finance@example.com";
    mockLambdaSend.mockRejectedValue(new Error("Invocation failed"));
    const service = new FinanceNotificationService({
      financeNotificationRepository: { getActiveTeamMembers: jest.fn() },
      getHostEmailByIdFn: jest.fn(),
      lambdaClient: { send: mockLambdaSend },
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(service.send("OWNER_PAYOUT_FAILED", { payoutId: "payout-1" })).resolves.toBeUndefined();
      expect(mockLambdaSend).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        "Finance notification delivery failed",
        { eventType: "OWNER_PAYOUT_FAILED", failed: 1 }
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  test("keeps a confirmed booking without a new paid transition from sending a duplicate email", async () => {
    const { controller, bookingService, notificationSender, booking } = buildController();
    bookingService.confirmPayment.mockResolvedValue({
      paymentConfirmed: true,
      newlyPaid: false,
      notificationContext: {
        hostId: booking.hostid,
        bookingId: booking.id,
        propertyId: booking.property_id,
        paymentId: booking.paymentid,
      },
    });

    const result = await controller.handlePaymentPatch({ paymentid: booking.paymentid });

    expect(result.response.paymentConfirmed).toBe(true);
    expect(notificationSender).not.toHaveBeenCalled();
  });

  test("deduplicates configured admin recipients before dispatching", async () => {
    process.env.NODE_ENV = "development";
    process.env.DOMITS_FINANCE_ADMIN_EMAILS =
      "finance@example.com, FINANCE@example.com,not-an-email";

    await sendFinanceNotification("OWNER_PAYOUT_FAILED", { payoutId: "payout-1" });

    expect(mockLambdaSend).toHaveBeenCalledTimes(1);
    const command = mockLambdaSend.mock.calls[0][0];
    expect(command.FunctionName).toBe("EmailNotificationService");
    expect(command.InvocationType).toBe("Event");
    const payload = JSON.parse(command.Payload.toString());
    expect(payload.body.toEmail).toBe("finance@example.com");
    expect(payload.body.subject).toContain("Owner payout failed");
    expect(payload.body.body).toContain("Payout: payout-1");
  });

  test("does not dispatch when no valid recipient is configured", async () => {
    process.env.NODE_ENV = "development";
    process.env.DOMITS_FINANCE_ADMIN_EMAILS = "not-an-email";

    await sendFinanceNotification("OWNER_PAYOUT_FAILED", { payoutId: "payout-1" });

    expect(mockLambdaSend).not.toHaveBeenCalled();
  });
});
