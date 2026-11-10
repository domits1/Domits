const s3Error = (name, httpStatusCode) => Object.assign(new Error(name), { name, $metadata: { httpStatusCode } });

export const buildFakeSitesBucketClient = ({ objects = {}, pageSize = 1000 } = {}) => {
  let version = 0;
  const nextEtag = () => `"v${(version += 1)}"`;
  const stored = new Map(Object.entries(objects).map(([key, body]) => [key, { body, etag: nextEtag() }]));
  const failures = [];
  const before = [];

  const handlers = {
    GetObjectCommand: ({ Key }) => {
      if (!stored.has(Key)) {
        throw s3Error("NoSuchKey", 404);
      }
      return { Body: { transformToString: async () => stored.get(Key).body } };
    },
    PutObjectCommand: ({ Key, Body }) => {
      stored.set(Key, { body: Body, etag: nextEtag() });
      return {};
    },
    DeleteObjectCommand: ({ Key, IfMatch }) => {
      if (IfMatch !== undefined && !stored.has(Key)) {
        throw s3Error("NoSuchKey", 404);
      }
      if (IfMatch !== undefined && stored.get(Key).etag !== IfMatch) {
        throw s3Error("PreconditionFailed", 412);
      }
      stored.delete(Key);
      return {};
    },
    ListObjectsV2Command: ({ Prefix = "", ContinuationToken }) => {
      const keys = [...stored.keys()].filter((key) => key.startsWith(Prefix)).sort();
      const start = Number(ContinuationToken || 0);
      const page = keys.slice(start, start + pageSize).map((Key) => ({ Key, ETag: stored.get(Key).etag }));
      const truncated = start + pageSize < keys.length;
      return {
        ...(page.length > 0 ? { Contents: page } : {}),
        IsTruncated: truncated,
        ...(truncated ? { NextContinuationToken: String(start + pageSize) } : {}),
      };
    },
  };

  return {
    calls: [],
    async send(command) {
      const name = command.constructor.name;
      const { Key, Prefix, IfMatch } = command.input;
      this.calls.push({ name, key: Key ?? Prefix, ...(IfMatch === undefined ? {} : { ifMatch: IfMatch }) });
      const hook = before.findIndex((entry) => entry.name === name && entry.key === Key);
      if (hook >= 0) {
        before.splice(hook, 1)[0].run();
      }
      const failure = failures.findIndex((entry) => entry.name === name && entry.key === (Key ?? Prefix));
      if (failure >= 0) {
        throw failures.splice(failure, 1)[0].error;
      }
      return handlers[name](command.input);
    },
    writes() {
      return this.calls
        .filter((call) => call.name === "PutObjectCommand" || call.name === "DeleteObjectCommand")
        .map((call) => `${call.name === "PutObjectCommand" ? "put" : "delete"} ${call.key}`);
    },
    objects() {
      return Object.fromEntries([...stored.entries()].map(([key, object]) => [key, object.body]));
    },
    put(key, body) {
      stored.set(key, { body, etag: nextEtag() });
    },
    failNext(name, key, error) {
      failures.push({ name, key, error });
    },
    beforeNext(name, key, run) {
      before.push({ name, key, run });
    },
  };
};
