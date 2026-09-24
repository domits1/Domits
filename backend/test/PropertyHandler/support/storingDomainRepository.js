const clone = (row) => ({ ...row, verificationDetails: { ...(row.verificationDetails || {}) } });

const createGate = () => {
  let releaseGate;
  let markReached;
  const reached = new Promise((resolve) => {
    markReached = resolve;
  });
  const opened = new Promise((resolve) => {
    releaseGate = resolve;
  });

  return {
    reached,
    opened,
    markReached: () => markReached(),
    release: () => releaseGate(),
  };
};

export const serializationConflict = () =>
  Object.assign(new Error("change conflicts with another transaction"), {
    code: "40001",
  });

export const createStoringDomainRepository = ({ rows = [], clock = () => 1757000000000 } = {}) => {
  const store = new Map(rows.map((row) => [row.id, clone(row)]));
  const gates = new Map();
  const failures = new Map();
  const calls = [];
  let nextId = 1;
  let transactionInFlight = false;

  const rowsForSite = (siteId) => [...store.values()].filter((row) => row.siteId === siteId);

  const passGate = async (name) => {
    const gate = gates.get(name);
    if (!gate) {
      return;
    }
    gates.delete(name);
    gate.markReached();
    await gate.opened;
  };

  const takeFailure = (name) => {
    const queued = failures.get(name);
    if (!queued?.length) {
      return null;
    }
    const failure = queued.shift();
    if (!queued.length) {
      failures.delete(name);
    }
    return failure;
  };

  const restoreFallbackInto = (draft, siteId, now) => {
    const changed = [];
    draft.forEach((row) => {
      if (row.siteId !== siteId) {
        return;
      }
      const shouldBePrimary = row.domainType === "FALLBACK";
      if (row.isPrimary === shouldBePrimary) {
        return;
      }
      row.isPrimary = shouldBePrimary;
      row.updatedAt = now;
      changed.push(clone(row));
    });
    return changed;
  };

  const runAtomically = async (name, work) => {
    if (transactionInFlight) {
      throw new Error(
        `storingDomainRepository models sequential transactions only, and ${name} overlapped another one. It replaces the whole store on commit, so it cannot represent two transactions in flight; pause outside the transaction, or drive one at a time.`
      );
    }
    transactionInFlight = true;

    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const draft = new Map([...store.entries()].map(([id, row]) => [id, clone(row)]));
        try {
          const result = await work(draft);
          await passGate(`${name}:commit`);
          const commitFailure = takeFailure(`${name}:commit`);
          if (commitFailure) {
            throw commitFailure;
          }
          store.clear();
          draft.forEach((row, id) => store.set(id, row));
          return result;
        } catch (error) {
          if (String(error?.code) !== "40001") {
            throw error;
          }
        }
      }
      throw serializationConflict();
    } finally {
      transactionInFlight = false;
    }
  };

  return {
    calls,
    snapshot: () => [...store.values()].map(clone),
    rowById: (id) => (store.has(id) ? clone(store.get(id)) : null),
    pauseBefore: (name) => {
      const gate = createGate();
      gates.set(name, gate);
      return gate;
    },
    failNext: (name, error) => {
      const queued = failures.get(name) || [];
      queued.push(error);
      failures.set(name, queued);
    },

    getDomainByName: async (domain) => {
      calls.push(["getDomainByName", domain]);
      const row = [...store.values()].find((entry) => entry.domain === domain);
      return row ? clone(row) : null;
    },

    getCustomDomainBySiteId: async (siteId) => {
      calls.push(["getCustomDomainBySiteId", siteId]);
      const row = rowsForSite(siteId).find((entry) => entry.domainType === "CUSTOM");
      return row ? clone(row) : null;
    },

    listDomainsBySiteId: async (siteId) => {
      calls.push(["listDomainsBySiteId", siteId]);
      return rowsForSite(siteId)
        .sort(
          (left, right) =>
            Number(right.isPrimary) - Number(left.isPrimary) || Number(left.createdAt) - Number(right.createdAt)
        )
        .map(clone);
    },

    countDomainsByTenantId: async (tenantId) =>
      [...store.values()].filter((row) => row.verificationDetails?.tenantId === tenantId).length,

    claimCustomDomain: async ({ siteId, domain, status, verificationDetails, lastCheckedAt }) => {
      calls.push(["claimCustomDomain", siteId, domain]);
      await passGate("claimCustomDomain");

      const failure = takeFailure("claimCustomDomain");
      if (failure) {
        throw failure;
      }

      const siteCustomDomain = rowsForSite(siteId).find(
        (entry) => entry.domainType === "CUSTOM" && entry.domain !== domain
      );
      if (siteCustomDomain) {
        throw Object.assign(new Error("duplicate key value violates unique constraint"), {
          code: "23505",
          constraint: "standalone_site_domain_custom_site_unique",
        });
      }

      const existing = [...store.values()].find((entry) => entry.domain === domain);
      if (existing) {
        return { record: clone(existing), created: false };
      }

      const now = clock();
      const record = {
        id: `claimed-${nextId++}`,
        siteId,
        domain,
        domainType: "CUSTOM",
        status,
        isPrimary: false,
        verificationDetails: { ...(verificationDetails || {}) },
        lastCheckedAt: lastCheckedAt ?? now,
        createdAt: now,
        updatedAt: now,
      };
      store.set(record.id, record);
      return { record: clone(record), created: true };
    },

    updateDomainStatusById: async (domainId, siteId, status, verificationDetails) => {
      calls.push(["updateDomainStatusById", domainId, status]);
      const row = store.get(domainId);
      if (!row || row.siteId !== siteId) {
        return null;
      }
      row.status = status;
      row.verificationDetails = { ...(verificationDetails || {}) };
      row.lastCheckedAt = clock();
      row.updatedAt = clock();
      return clone(row);
    },

    updateDomainVerificationDetailsById: async (domainId, siteId, verificationDetails) => {
      calls.push(["updateDomainVerificationDetailsById", domainId]);
      const row = store.get(domainId);
      if (!row || row.siteId !== siteId) {
        return null;
      }
      row.verificationDetails = { ...(verificationDetails || {}) };
      row.updatedAt = clock();
      return clone(row);
    },

    updateDomainStatusAndRestoreFallbackById: async (domainId, siteId, status, verificationDetails) => {
      calls.push(["updateDomainStatusAndRestoreFallbackById", domainId, status]);
      await passGate("updateDomainStatusAndRestoreFallbackById");

      return runAtomically("updateDomainStatusAndRestoreFallbackById", async (draft) => {
        const row = draft.get(domainId);
        if (!row || row.siteId !== siteId) {
          return { record: null, changedRecords: [] };
        }

        const now = clock();
        row.status = status;
        row.verificationDetails = { ...(verificationDetails || {}) };
        row.lastCheckedAt = now;
        row.updatedAt = now;
        const record = clone(row);

        const restoreFailure = takeFailure("restoreFallback");
        if (restoreFailure) {
          throw restoreFailure;
        }

        return { record, changedRecords: restoreFallbackInto(draft, siteId, now) };
      });
    },

    deleteDomainAndRestoreFallbackById: async (domainId, siteId) => {
      calls.push(["deleteDomainAndRestoreFallbackById", domainId]);
      await passGate("deleteDomainAndRestoreFallbackById");

      return runAtomically("deleteDomainAndRestoreFallbackById", async (draft) => {
        const row = draft.get(domainId);
        if (!row || row.siteId !== siteId) {
          return { deleted: false, changedRecords: [] };
        }
        draft.delete(domainId);

        const restoreFailure = takeFailure("restoreFallback");
        if (restoreFailure) {
          throw restoreFailure;
        }

        return { deleted: true, changedRecords: restoreFallbackInto(draft, siteId, clock()) };
      });
    },

    deleteDomainById: async (domainId, siteId) => {
      calls.push(["deleteDomainById", domainId]);
      const row = store.get(domainId);
      if (!row || row.siteId !== siteId) {
        return false;
      }
      store.delete(domainId);
      return true;
    },

    promoteDomainToPrimary: async (siteId, domainId) => {
      calls.push(["promoteDomainToPrimary", siteId, domainId]);
      const candidate = store.get(domainId);
      if (!candidate || candidate.siteId !== siteId) {
        return [];
      }
      if (candidate.domainType !== "CUSTOM" || candidate.status !== "ACTIVE") {
        return [];
      }

      const now = clock();
      const changed = [];
      rowsForSite(siteId).forEach((entry) => {
        const row = store.get(entry.id);
        const shouldBePrimary = row.id === domainId;
        if (row.isPrimary === shouldBePrimary) {
          return;
        }
        row.isPrimary = shouldBePrimary;
        row.updatedAt = now;
        changed.push(clone(row));
      });
      return changed;
    },

    restoreFallbackDomainAsPrimary: async (siteId) => {
      calls.push(["restoreFallbackDomainAsPrimary", siteId]);
      const draft = new Map([...store.entries()]);
      return restoreFallbackInto(draft, siteId, clock());
    },
  };
};
