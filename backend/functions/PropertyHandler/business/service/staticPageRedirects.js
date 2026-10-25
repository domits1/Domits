import { StaticPageRedirectStore, isRedirectStoreConflict } from "../../data/repository/staticPageRedirectStore.js";
import { planSiteRedirects } from "./staticPageRedirectPlan.js";

const MAX_WRITE_ATTEMPTS = 3;

export class StaticPageRedirects {
  constructor({ store = new StaticPageRedirectStore() } = {}) {
    this.store = store;
  }

  isEnabled() {
    return this.store.isEnabled();
  }

  async remove(hostnames) {
    if (!this.isEnabled() || hostnames.length === 0) {
      return false;
    }
    return this.#write((snapshot) => (snapshot.itemCount === 0 ? null : { deletes: hostnames }));
  }

  async add(puts) {
    if (!this.isEnabled() || puts.length === 0) {
      return false;
    }
    return this.#write(() => ({ puts }));
  }

  async snapshot() {
    return this.isEnabled() ? this.store.describe() : null;
  }

  async reconcile({ sites, snapshot }) {
    if (sites.length === 0) {
      return { put: 0, deleted: 0 };
    }
    const expected = new Map(sites.flatMap((site) => planSiteRedirects(site).puts.map((put) => [put.hostname, put.primary])));
    if (expected.size === 0 && snapshot.itemCount === 0) {
      return { put: 0, deleted: 0 };
    }
    const current = await this.store.listRedirects();
    const puts = [...expected]
      .filter(([hostname, primary]) => current.get(hostname) !== primary)
      .map(([hostname, primary]) => ({ hostname, primary }));
    const deletes = [...current.keys()].filter((hostname) => !expected.has(hostname));
    if (puts.length + deletes.length > 0) {
      try {
        await this.store.update({ etag: snapshot.etag, puts, deletes });
      } catch (error) {
        if (isRedirectStoreConflict(error)) {
          return { put: 0, deleted: 0, conflict: true };
        }
        throw error;
      }
    }
    return { put: puts.length, deleted: deletes.length };
  }

  async #write(changeFor) {
    for (let attempt = 1; ; attempt += 1) {
      const snapshot = await this.store.describe();
      const change = changeFor(snapshot);
      if (!change) {
        return false;
      }
      try {
        await this.store.update({ etag: snapshot.etag, ...change });
        return true;
      } catch (error) {
        if (!isRedirectStoreConflict(error) || attempt >= MAX_WRITE_ATTEMPTS) {
          throw error;
        }
      }
    }
  }
}
