import { describe, expect, it, jest } from "@jest/globals";
import fc from "fast-check";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { ConflictException } from "../../functions/PropertyHandler/util/exception/ConflictException.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { TypeException } from "../../functions/PropertyHandler/util/exception/TypeException.js";
import { PROPERTY_STATUS } from "../../functions/PropertyHandler/util/propertyStatus.js";

const PROPERTY_ID = "property-1";

const UPDATED_AT = 1_700_000_000_000;
const ACTOR_ID = "admin-1";
const REASON = "Photos are blurry.";
const conflict = (code) => Object.assign(new Error("change conflicts with another transaction"), { code });

const invoke = (service, method, extra = {}) =>
  method === "rejectProperty"
    ? service.rejectProperty(PROPERTY_ID, { actorId: ACTOR_ID, reason: REASON, expectedUpdatedAt: UPDATED_AT, ...extra })
    : service.approveProperty(PROPERTY_ID, { actorId: ACTOR_ID, expectedUpdatedAt: UPDATED_AT, ...extra });

const buildService = (initialStatus) => {
  const row = initialStatus === null ? null : { id: PROPERTY_ID, status: initialStatus, updatedAt: UPDATED_AT };
  const transitionStatus = jest.fn(async (id, { fromStatuses, toStatus, expectedUpdatedAt }) => {
    if (!row || row.id !== id) {
      return { outcome: "not_found" };
    }
    if (!fromStatuses.includes(row.status)) {
      return { outcome: "wrong_status", currentStatus: row.status };
    }
    if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== row.updatedAt) {
      return { outcome: "stale", currentUpdatedAt: row.updatedAt };
    }
    const fromStatus = row.status;
    row.status = toStatus;
    row.updatedAt += 1;
    return { outcome: "changed", fromStatus, updatedAt: row.updatedAt };
  });

  const service = new PropertyService();
  service.propertyRepository = {
    transitionStatusWithEvent: transitionStatus,
    getPropertyById: jest.fn(async () => (row ? { ...row } : null)),
  };
  service.updatePropertyStatus = jest.fn(async (id, status) => {
    row.status = status;
    return { ...row };
  });
  return { service, row, transitionStatus };
};

describe("PropertyService.requestHostStatusChange", () => {
  it.each([PROPERTY_STATUS.INACTIVE, PROPERTY_STATUS.REJECTED, PROPERTY_STATUS.ARCHIVED])(
    "turns an ACTIVE request from %s into PENDING_REVIEW",
    async (initialStatus) => {
      const { service } = buildService(initialStatus);

      const result = await service.requestHostStatusChange(PROPERTY_ID, "ACTIVE");

      expect(result.status).toBe(PROPERTY_STATUS.PENDING_REVIEW);
    }
  );

  it.each([undefined, null, "", "active", " ACTIVE "])(
    "treats the request %j like ACTIVE, so the legacy no-status call also only submits",
    async (requested) => {
      const { service } = buildService(PROPERTY_STATUS.INACTIVE);

      const result = await service.requestHostStatusChange(PROPERTY_ID, requested);

      expect(result.status).toBe(PROPERTY_STATUS.PENDING_REVIEW);
    }
  );

  it.each([PROPERTY_STATUS.ACTIVE, PROPERTY_STATUS.PENDING_REVIEW])(
    "leaves a %s property unchanged when the host asks for ACTIVE",
    async (initialStatus) => {
      const { service, row } = buildService(initialStatus);

      const result = await service.requestHostStatusChange(PROPERTY_ID, "ACTIVE");

      expect(result.status).toBe(initialStatus);
      expect(row.status).toBe(initialStatus);
    }
  );

  it("only matches INACTIVE, REJECTED and ARCHIVED rows, never ACTIVE or PENDING_REVIEW", async () => {
    const { service, transitionStatus } = buildService(PROPERTY_STATUS.INACTIVE);

    await service.requestHostStatusChange(PROPERTY_ID, "ACTIVE", { actorId: "host-1" });

    expect(transitionStatus).toHaveBeenCalledTimes(1);
    expect(transitionStatus.mock.calls[0]).toEqual([
      PROPERTY_ID,
      {
        fromStatuses: [PROPERTY_STATUS.INACTIVE, PROPERTY_STATUS.REJECTED, PROPERTY_STATUS.ARCHIVED],
        toStatus: PROPERTY_STATUS.PENDING_REVIEW,
        action: "SUBMITTED",
        actorId: "host-1",
      },
    ]);
  });

  it("answers a lost conflict race with 503 instead of a raw database error", async () => {
    const { service, transitionStatus } = buildService(PROPERTY_STATUS.INACTIVE);
    transitionStatus.mockRejectedValueOnce(conflict("40001"));

    await expect(service.requestHostStatusChange(PROPERTY_ID, "ACTIVE", { actorId: "host-1" })).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it("does not overwrite an approval that lands between the host's click and the update", async () => {
    const { service, row, transitionStatus } = buildService(PROPERTY_STATUS.INACTIVE);
    transitionStatus.mockImplementationOnce(async () => {
      row.status = PROPERTY_STATUS.ACTIVE;
      return { outcome: "wrong_status", currentStatus: PROPERTY_STATUS.ACTIVE };
    });

    const result = await service.requestHostStatusChange(PROPERTY_ID, "ACTIVE");

    expect(result.status).toBe(PROPERTY_STATUS.ACTIVE);
    expect(row.status).toBe(PROPERTY_STATUS.ACTIVE);
  });

  it("throws NotFoundException when the property does not exist", async () => {
    const { service } = buildService(null);

    await expect(service.requestHostStatusChange(PROPERTY_ID, "ACTIVE")).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([PROPERTY_STATUS.INACTIVE, PROPERTY_STATUS.ARCHIVED])(
    "passes a %s request and its archive metadata to updatePropertyStatus",
    async (requested) => {
      const { service, transitionStatus } = buildService(PROPERTY_STATUS.PENDING_REVIEW);
      const metadata = { archivedBy: "host-1", archiveReason: "sold" };

      const result = await service.requestHostStatusChange(PROPERTY_ID, requested, { metadata });

      expect(service.updatePropertyStatus).toHaveBeenCalledWith(PROPERTY_ID, requested, metadata);
      expect(transitionStatus).not.toHaveBeenCalled();
      expect(result.status).toBe(requested);
    }
  );

  it.each([PROPERTY_STATUS.PENDING_REVIEW, PROPERTY_STATUS.REJECTED, "DRAFT", "LIVE"])(
    "rejects the host request %s with a 400 and changes nothing",
    async (requested) => {
      const { service, transitionStatus } = buildService(PROPERTY_STATUS.INACTIVE);

      const failure = service.requestHostStatusChange(PROPERTY_ID, requested);

      await expect(failure).rejects.toBeInstanceOf(TypeException);
      await expect(failure).rejects.toMatchObject({ statusCode: 400 });
      expect(transitionStatus).not.toHaveBeenCalled();
      expect(service.updatePropertyStatus).not.toHaveBeenCalled();
    }
  );

  it("never moves a property into ACTIVE, whatever sequence of requests a host sends", () => {
    const initialStatus = fc.constantFrom(
      PROPERTY_STATUS.INACTIVE,
      PROPERTY_STATUS.ARCHIVED,
      PROPERTY_STATUS.REJECTED,
      PROPERTY_STATUS.PENDING_REVIEW
    );
    const request = fc.constantFrom("ACTIVE", "active", "INACTIVE", "ARCHIVED", undefined, null);

    return fc.assert(
      fc.asyncProperty(initialStatus, fc.array(request, { maxLength: 12 }), async (initial, requests) => {
        const { service, row } = buildService(initial);

        for (const requested of requests) {
          await service.requestHostStatusChange(PROPERTY_ID, requested);
          if (row.status === PROPERTY_STATUS.ACTIVE) {
            return false;
          }
        }
        return true;
      })
    );
  });
});

describe.each([
  ["approveProperty", PROPERTY_STATUS.ACTIVE],
  ["rejectProperty", PROPERTY_STATUS.REJECTED],
])("PropertyService.%s", (method, decision) => {
  it(`moves a PENDING_REVIEW property to ${decision}`, async () => {
    const { service, transitionStatus } = buildService(PROPERTY_STATUS.PENDING_REVIEW);

    const result = await invoke(service, method);

    expect(result.status).toBe(decision);
    expect(transitionStatus.mock.calls[0][1]).toMatchObject({
      fromStatuses: [PROPERTY_STATUS.PENDING_REVIEW],
      toStatus: decision,
      action: method === "rejectProperty" ? "REJECTED" : "APPROVED",
      actorId: ACTOR_ID,
      expectedUpdatedAt: UPDATED_AT,
    });
  });

  it("throws a 409 stale_review and changes nothing when the property changed after it was loaded", async () => {
    const { service, row } = buildService(PROPERTY_STATUS.PENDING_REVIEW);

    const failure = invoke(service, method, { expectedUpdatedAt: UPDATED_AT - 1 });

    await expect(failure).rejects.toBeInstanceOf(ConflictException);
    await expect(failure).rejects.toMatchObject({ statusCode: 409, code: "stale_review" });
    expect(row.status).toBe(PROPERTY_STATUS.PENDING_REVIEW);
  });

  it.each(["40001", "OC001"])("answers a %s that outlived the retries with 503", async (code) => {
    const { service, transitionStatus } = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    const original = conflict(code);
    transitionStatus.mockRejectedValueOnce(original);

    const thrown = await invoke(service, method).catch((error) => error);

    expect(thrown.statusCode).toBe(503);
    expect(thrown.cause).toBe(original);
  });

  it("lets an error that is not a conflict through unchanged", async () => {
    const { service, transitionStatus } = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    const failure = new Error("connection reset");
    transitionStatus.mockRejectedValueOnce(failure);

    await expect(invoke(service, method)).rejects.toBe(failure);
  });

  it.each([
    PROPERTY_STATUS.ACTIVE,
    PROPERTY_STATUS.INACTIVE,
    PROPERTY_STATUS.ARCHIVED,
    PROPERTY_STATUS.REJECTED,
    "SOMETHING_ELSE",
  ])("throws a 409 ConflictException and changes nothing for a %s property", async (initialStatus) => {
    const { service, row } = buildService(initialStatus);

    const failure = invoke(service, method);

    await expect(failure).rejects.toBeInstanceOf(ConflictException);
    await expect(failure).rejects.toMatchObject({ statusCode: 409, code: "wrong_status" });
    expect(row.status).toBe(initialStatus);
  });

  it("throws a 409 on the second call, so a decision cannot be applied twice", async () => {
    const { service } = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    await invoke(service, method);

    await expect(invoke(service, method)).rejects.toBeInstanceOf(ConflictException);
  });

  it("throws NotFoundException when the property does not exist", async () => {
    const { service } = buildService(null);

    await expect(invoke(service, method)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws a 409 when the host withdrew the property before the decision", async () => {
    const { service, row, transitionStatus } = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    transitionStatus.mockImplementationOnce(async () => {
      row.status = PROPERTY_STATUS.INACTIVE;
      return { outcome: "wrong_status", currentStatus: PROPERTY_STATUS.INACTIVE };
    });

    await expect(invoke(service, method)).rejects.toBeInstanceOf(ConflictException);
    expect(row.status).toBe(PROPERTY_STATUS.INACTIVE);
  });
});

describe("PropertyService.approveProperty reason", () => {
  it("passes no reason to the repository", async () => {
    const { service, transitionStatus } = buildService(PROPERTY_STATUS.PENDING_REVIEW);

    await service.approveProperty(PROPERTY_ID, { actorId: ACTOR_ID, reason: REASON });

    expect(transitionStatus.mock.calls[0][1]).not.toHaveProperty("reason");
  });
});

describe("PropertyService.rejectProperty reason", () => {
  it.each([
    ["a single character", "a", "a"],
    ["the maximum length", "x".repeat(500), "x".repeat(500)],
    ["the maximum length plus surrounding whitespace", `  ${"x".repeat(500)}\n`, "x".repeat(500)],
    ["a padded reason", "  Photos are blurry.  ", REASON],
  ])("stores %s trimmed", async (_name, given, stored) => {
    const { service, transitionStatus } = buildService(PROPERTY_STATUS.PENDING_REVIEW);

    await invoke(service, "rejectProperty", { reason: given });

    expect(transitionStatus.mock.calls[0][1].reason).toBe(stored);
  });

  it.each([[""], ["   \n"], [undefined], [null], [5], ["x".repeat(501)], [` ${"x".repeat(501)} `]])(
    "throws a 400 TypeException for the reason %j and changes nothing",
    async (reason) => {
      const { service, transitionStatus } = buildService(PROPERTY_STATUS.PENDING_REVIEW);

      const failure = invoke(service, "rejectProperty", { reason });

      await expect(failure).rejects.toBeInstanceOf(TypeException);
      await expect(failure).rejects.toMatchObject({ statusCode: 400 });
      expect(transitionStatus).not.toHaveBeenCalled();
    }
  );
});

describe("a decision after the other decision", () => {
  it("cannot approve a rejected property or reject an approved one", async () => {
    const rejected = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    await invoke(rejected.service, "rejectProperty", { expectedUpdatedAt: undefined });
    await expect(invoke(rejected.service, "approveProperty", { expectedUpdatedAt: undefined })).rejects.toBeInstanceOf(
      ConflictException
    );

    const approved = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    await invoke(approved.service, "approveProperty", { expectedUpdatedAt: undefined });
    await expect(invoke(approved.service, "rejectProperty", { expectedUpdatedAt: undefined })).rejects.toBeInstanceOf(
      ConflictException
    );
  });
});
