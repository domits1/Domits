import "@aws-sdk/signature-v4a";
import {
  CloudFrontKeyValueStoreClient,
  DescribeKeyValueStoreCommand,
  ListKeysCommand,
  UpdateKeysCommand,
} from "@aws-sdk/client-cloudfront-keyvaluestore";

const KVS_ARN_ENV_NAME = "STATIC_PAGE_REDIRECTS_KVS_ARN";
const KVS_REGION = "us-east-1";
const MAX_KEYS_PER_CALL = 50;
const PRECONDITION_FAILED_PATTERN = /pre-condition failed/i;

export const isRedirectStoreConflict = (error) =>
  error?.name === "ValidationException" && PRECONDITION_FAILED_PATTERN.test(String(error?.message || ""));

export class StaticPageRedirectStore {
  constructor({ kvsArn = process.env[KVS_ARN_ENV_NAME], client = null } = {}) {
    this.kvsArn = String(kvsArn || "").trim();
    this.client = client || (this.kvsArn ? new CloudFrontKeyValueStoreClient({ region: KVS_REGION }) : null);
  }

  isEnabled() {
    return Boolean(this.kvsArn);
  }

  async describe() {
    const result = await this.client.send(new DescribeKeyValueStoreCommand({ KvsARN: this.kvsArn }));
    return { etag: result.ETag, itemCount: Number(result.ItemCount || 0) };
  }

  async listRedirects() {
    const redirects = new Map();
    let nextToken;
    do {
      const page = await this.client.send(
        new ListKeysCommand({ KvsARN: this.kvsArn, MaxResults: MAX_KEYS_PER_CALL, NextToken: nextToken })
      );
      (page.Items || []).forEach((item) => redirects.set(item.Key, item.Value));
      nextToken = page.NextToken;
    } while (nextToken);
    return redirects;
  }

  async update({ etag, puts = [], deletes = [] }) {
    const changes = [
      ...puts.map(({ hostname, primary }) => ({ put: { Key: hostname, Value: primary } })),
      ...deletes.map((hostname) => ({ remove: { Key: hostname } })),
    ];
    let currentEtag = etag;
    for (let start = 0; start < changes.length; start += MAX_KEYS_PER_CALL) {
      const part = changes.slice(start, start + MAX_KEYS_PER_CALL);
      const partPuts = part.filter((change) => change.put).map((change) => change.put);
      const partDeletes = part.filter((change) => change.remove).map((change) => change.remove);
      const result = await this.client.send(
        new UpdateKeysCommand({
          KvsARN: this.kvsArn,
          IfMatch: currentEtag,
          ...(partPuts.length > 0 ? { Puts: partPuts } : {}),
          ...(partDeletes.length > 0 ? { Deletes: partDeletes } : {}),
        })
      );
      currentEtag = result.ETag;
    }
    return currentEtag;
  }
}
