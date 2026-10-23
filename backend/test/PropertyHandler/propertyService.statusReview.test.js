import { describe, expect, it, jest } from "@jest/globals";
import fc from "fast-check";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { ConflictException } from "../../functions/PropertyHandler/util/exception/ConflictException.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { TypeException } from "../../functions/PropertyHandler/util/exception/TypeException.js";
import { PROPERTY_STATUS } from "../../functions/PropertyHandler/util/propertyStatus.js";

const PROPERTY_ID = "property-1";

// In-memory stand-in for the table: transitionStatus has the same compare-and-set meaning as the SQL.
const buildService = (initialStatus) => {
  const row = initialStatus === null ? null : { id: PROPERTY_ID, status: initialStatus };
  const transitionStatus = jest.fn(async (id, fromStatuses, toStatus) => {
    if (!row || row.id !== id || !fromStatuses.includes(row.status)) {
      return 0;
    }
    row.status = toStatus;
    return 1;
  });

  const service = new PropertyService();
  service.propertyRepository = {
    transitionStatus,
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

    await service.requestHostStatusChange(PROPERTY_ID, "ACTIVE");

    expect(transitionStatus).toHaveBeenCalledTimes(1);
    expect(transitionStatus).toHaveBeenCalledWith(
      PROPERTY_ID,
      [PROPERTY_STATUS.INACTIVE, PROPERTY_STATUS.REJECTED, PROPERTY_STATUS.ARCHIVED],
      PROPERTY_STATUS.PENDING_REVIEW
    );
  });

  it("does not overwrite an approval that lands between the host's click and the update", async () => {
    const { service, row, transitionStatus } = buildService(PROPERTY_STATUS.INACTIVE);
    transitionStatus.mockImplementationOnce(async () => {
      row.status = PROPERTY_STATUS.ACTIVE;
      return 0;
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

      const result = await service.requestHostStatusChange(PROPERTY_ID, requested, metadata);

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

    const result = await service[method](PROPERTY_ID);

    expect(result.status).toBe(decision);
    expect(transitionStatus).toHaveBeenCalledWith(PROPERTY_ID, [PROPERTY_STATUS.PENDING_REVIEW], decision);
  });

  it.each([
    PROPERTY_STATUS.ACTIVE,
    PROPERTY_STATUS.INACTIVE,
    PROPERTY_STATUS.ARCHIVED,
    PROPERTY_STATUS.REJECTED,
    "SOMETHING_ELSE",
  ])("throws a 409 ConflictException and changes nothing for a %s property", async (initialStatus) => {
    const { service, row } = buildService(initialStatus);

    const failure = service[method](PROPERTY_ID);

    await expect(failure).rejects.toBeInstanceOf(ConflictException);
    await expect(failure).rejects.toMatchObject({ statusCode: 409 });
    expect(row.status).toBe(initialStatus);
  });

  it("throws a 409 on the second call, so a decision cannot be applied twice", async () => {
    const { service } = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    await service[method](PROPERTY_ID);

    await expect(service[method](PROPERTY_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it("throws NotFoundException when the property does not exist", async () => {
    const { service } = buildService(null);

    await expect(service[method](PROPERTY_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws a 409 when the host withdrew the property before the decision", async () => {
    const { service, row, transitionStatus } = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    transitionStatus.mockImplementationOnce(async () => {
      row.status = PROPERTY_STATUS.INACTIVE;
      return 0;
    });

    await expect(service[method](PROPERTY_ID)).rejects.toBeInstanceOf(ConflictException);
    expect(row.status).toBe(PROPERTY_STATUS.INACTIVE);
  });
});

describe("a decision after the other decision", () => {
  it("cannot approve a rejected property or reject an approved one", async () => {
    const rejected = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    await rejected.service.rejectProperty(PROPERTY_ID);
    await expect(rejected.service.approveProperty(PROPERTY_ID)).rejects.toBeInstanceOf(ConflictException);

    const approved = buildService(PROPERTY_STATUS.PENDING_REVIEW);
    await approved.service.approveProperty(PROPERTY_ID);
    await expect(approved.service.rejectProperty(PROPERTY_ID)).rejects.toBeInstanceOf(ConflictException);
  });
});
