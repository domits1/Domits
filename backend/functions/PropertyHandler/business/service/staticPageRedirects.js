import { StaticPageRedirectStore, isRedirectStoreConflict } from "../../data/repository/staticPageRedirectStore.js";

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
