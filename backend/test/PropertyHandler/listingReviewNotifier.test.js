import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  ListingReviewNotifier,
  NOTIFICATION_TIMEOUT_MS,
} from "../../functions/PropertyHandler/business/service/listingReviewNotifier.js";

const HOST_EMAIL = "host@example.com";

const cognitoUser = (email = HOST_EMAIL) => ({
  Username: "host-1",
  UserAttributes: [
    { Name: "given_name", Value: "Host" },
    ...(email === null ? [] : [{ Name: "email", Value: email }]),
  ],
});

const decision = (overrides = {}) => ({
  hostId: "host-1",
  propertyId: "property-1",
  title: "Sea View Cabin",
  outcome: "APPROVED",
  ...overrides,
});

describe("ListingReviewNotifier", () => {
  let send;
  let getUserById;
  let notifier;
  let errorSpy;

  const emailCalls = () => send.mock.calls.map(([command]) => command.input);
  const sentEmail = () => JSON.parse(emailCalls()[0].Payload).body;

  beforeEach(() => {
    send = jest.fn(async () => ({}));
    getUserById = jest.fn(async () => cognitoUser());
    notifier = new ListingReviewNotifier({ lambdaClient: { send }, cognitoRepository: { getUserById } });
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("reads the host's email from Cognito by host id and emails them asynchronously", async () => {
    await notifier.notifyDecision(decision());

    expect(getUserById).toHaveBeenCalledWith("host-1");
    expect(send).toHaveBeenCalledTimes(1);
    expect(emailCalls()[0].FunctionName).toBe("EmailNotificationService");
    expect(emailCalls()[0].InvocationType).toBe("Event");
    expect(sentEmail().toEmail).toBe(HOST_EMAIL);
  });

  it("invokes no Lambda other than EmailNotificationService", async () => {
    await notifier.notifyDecision(decision());
    await notifier.notifyDecision(decision({ outcome: "REJECTED", reason: "No licence." }));

    expect(new Set(emailCalls().map((input) => input.FunctionName))).toEqual(new Set(["EmailNotificationService"]));
  });

  it("tells the host the listing was approved", async () => {
    await notifier.notifyDecision(decision());

    const { subject, body } = sentEmail();
    expect(subject).toBe("Your listing was approved: Sea View Cabin");
    expect(body).toContain("Sea View Cabin");
    expect(body).toContain("approved");
  });

  it("puts the rejection reason in the body and never in the subject", async () => {
    await notifier.notifyDecision(decision({ outcome: "REJECTED", reason: "Photos are blurry.\nPlease retake them." }));

    const { subject, body } = sentEmail();
    expect(subject).toBe("Your listing was not approved: Sea View Cabin");
    expect(subject).not.toContain("blurry");
    expect(body).toContain("Reason:\nPhotos are blurry.\nPlease retake them.");
  });

  it.each([[undefined], [null], [""], ["   \n"], [5]])(
    "leaves the reason block out of a rejection when the reason is %j",
    async (reason) => {
      await notifier.notifyDecision(decision({ outcome: "REJECTED", reason }));

      const { body } = sentEmail();
      expect(body).toContain("was not approved");
      expect(body).not.toContain("undefined");
      expect(body).not.toContain("null");
      expect(body).not.toContain("Reason:");
    }
  );

  it("keeps the subject on a single line when the title has line breaks", async () => {
    await notifier.notifyDecision(decision({ title: "Sea\r\nView\n  Cabin" }));

    expect(sentEmail().subject).toBe("Your listing was approved: Sea View Cabin");
  });

  it("shortens a very long title in the subject only", async () => {
    const title = "T".repeat(300);

    await notifier.notifyDecision(decision({ title }));

    const { subject, body } = sentEmail();
    expect(subject.length).toBeLessThan(150);
    expect(body).toContain(title);
  });

  it("never carries the reviewer's identity into the email", async () => {
    await notifier.notifyDecision(decision({ outcome: "REJECTED", reason: "No licence.", actorId: "admin-secret-42" }));

    expect(JSON.stringify(emailCalls())).not.toContain("admin-secret-42");
  });

  it.each(["SUBMITTED", "ARCHIVED", undefined])("sends nothing for the outcome %s", async (outcome) => {
    await notifier.notifyDecision(decision({ outcome }));

    expect(getUserById).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing and does not throw when the property has no host", async () => {
    await expect(notifier.notifyDecision(decision({ hostId: undefined }))).resolves.toBeUndefined();

    expect(getUserById).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("does not throw and sends no email when the Cognito lookup fails", async () => {
    getUserById.mockRejectedValueOnce(new Error("not authorized to perform cognito-idp:AdminGetUser"));

    await expect(notifier.notifyDecision(decision())).resolves.toBeUndefined();

    expect(send).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it.each([[cognitoUser(null)], [cognitoUser("")], [undefined]])(
    "does not throw and sends no email when Cognito returns no email (%#)",
    async (user) => {
      getUserById.mockResolvedValueOnce(user);

      await expect(notifier.notifyDecision(decision())).resolves.toBeUndefined();

      expect(send).not.toHaveBeenCalled();
    }
  );

  it("does not throw when sending the email fails", async () => {
    send.mockRejectedValueOnce(new Error("throttled"));

    await expect(notifier.notifyDecision(decision())).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  describe("when a dependency never answers", () => {
    const never = () => new Promise(() => {});

    const settleAfterTimeout = async (call) => {
      jest.useFakeTimers();
      try {
        let settled = false;
        const pending = call().then(() => {
          settled = true;
        });
        await jest.advanceTimersByTimeAsync(NOTIFICATION_TIMEOUT_MS - 1);
        const settledEarly = settled;
        await jest.advanceTimersByTimeAsync(1);
        await pending;
        return { settledEarly, settled };
      } finally {
        jest.useRealTimers();
      }
    };

    it("gives up on a hung Cognito lookup after the time limit and does not hang the caller", async () => {
      getUserById.mockImplementationOnce(never);

      const outcome = await settleAfterTimeout(() => notifier.notifyDecision(decision()));

      expect(outcome).toEqual({ settledEarly: false, settled: true });
      expect(send).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        "Listing review notification failed",
        expect.objectContaining({ propertyId: "property-1", outcome: "APPROVED", code: "NOTIFICATION_TIMEOUT" })
      );
    });

    it("gives up on a hung Lambda invoke after the time limit and does not hang the caller", async () => {
      send.mockImplementationOnce(never);

      const outcome = await settleAfterTimeout(() => notifier.notifyDecision(decision()));

      expect(outcome).toEqual({ settledEarly: false, settled: true });
      expect(errorSpy).toHaveBeenCalledWith(
        "Listing review notification failed",
        expect.objectContaining({ code: "NOTIFICATION_TIMEOUT" })
      );
    });

    it("shares one time limit between the lookup and the invoke", async () => {
      jest.useFakeTimers();
      try {
        const slow = (value) => new Promise((resolve) => setTimeout(() => resolve(value), NOTIFICATION_TIMEOUT_MS - 500));
        getUserById.mockImplementationOnce(() => slow(cognitoUser()));
        send.mockImplementationOnce(() => slow({}));

        const pending = notifier.notifyDecision(decision());
        await jest.advanceTimersByTimeAsync(NOTIFICATION_TIMEOUT_MS);
        await pending;

        expect(errorSpy).toHaveBeenCalledWith(
          "Listing review notification failed",
          expect.objectContaining({ code: "NOTIFICATION_TIMEOUT" })
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it("does not log a timeout when both calls answer in time", async () => {
      await notifier.notifyDecision(decision());

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  it("keeps the reason and the host's email out of the logs", async () => {
    send.mockRejectedValueOnce(new Error(`could not reach ${HOST_EMAIL}: Secret reason text`));

    await notifier.notifyDecision(decision({ outcome: "REJECTED", reason: "Secret reason text" }));

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain("Secret reason text");
    expect(logged).not.toContain(HOST_EMAIL);
  });
});
