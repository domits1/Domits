const MAX_KEYS_PER_UPDATE = 50;

const validationError = (message) => Object.assign(new Error(message), { name: "ValidationException" });

export const buildFakeKeyValueStoreClient = ({ keys = {}, log = [] } = {}) => {
  const state = { keys: new Map(Object.entries(keys)), version: 1, beforeUpdate: [], failNext: [] };
  const etag = () => `etag-${state.version}`;
  const handlers = {
    DescribeKeyValueStoreCommand: () => ({ ETag: etag(), ItemCount: state.keys.size }),
    ListKeysCommand: ({ MaxResults = MAX_KEYS_PER_UPDATE, NextToken }) => {
      const entries = [...state.keys.entries()].sort(([left], [right]) => left.localeCompare(right));
      const start = Number(NextToken || 0);
      const page = entries.slice(start, start + MaxResults).map(([Key, Value]) => ({ Key, Value }));
      return { Items: page, ...(start + MaxResults < entries.length ? { NextToken: String(start + MaxResults) } : {}) };
    },
    UpdateKeysCommand: ({ IfMatch, Puts = [], Deletes = [] }) => {
      state.beforeUpdate.shift()?.();
      if (IfMatch !== etag()) {
        throw validationError("Pre-Condition failed during update of Key-Value-Store");
      }
      const changed = [...Puts.map((put) => put.Key), ...Deletes.map((entry) => entry.Key)];
      if (changed.length === 0) {
        throw validationError("Validation error during update keys. Payload does not contain any update.");
      }
      if (new Set(changed).size !== changed.length) {
        throw validationError("Payload contains multiple updates for the same key.");
      }
      if (changed.length > MAX_KEYS_PER_UPDATE) {
        throw Object.assign(new Error("Limit exceeded"), { name: "ServiceQuotaExceededException" });
      }
      Deletes.forEach((entry) => state.keys.delete(entry.Key));
      Puts.forEach((put) => state.keys.set(put.Key, put.Value));
      state.version += 1;
      return { ETag: etag(), ItemCount: state.keys.size };
    },
  };

  return {
    state,
    calls: [],
    async send(command) {
      const name = command.constructor.name;
      this.calls.push({ name, input: command.input });
      log.push(`kvs:${name}`);
      const failure = state.failNext.shift();
      if (failure) {
        throw failure;
      }
      return handlers[name](command.input);
    },
    writeBeforeNextUpdate() {
      state.beforeUpdate.push(() => {
        state.keys.set("someone-else.example.com", "www.example.com");
        state.version += 1;
      });
    },
    failNextCall(error) {
      state.failNext.push(error);
    },
  };
};
