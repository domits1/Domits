import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

class SystemManagerRepository {
  constructor() {
    if (process.env.TEST === "true") {
      this.ssmClient = null;
    } else {
      this.ssmClient = new SSMClient({ region: "eu-north-1" });
    }
  }

  async getSystemManagerParameter(parameterName) {
    if (process.env.TEST === "true") {
      // For unit/e2e tests, avoid real AWS calls.
      // Return dummy but consistent values; DB tests can override via env if needed.
      return "test-value";
    }

    const params = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: false,
    });
    const result = await this.ssmClient.send(params);
    return result.Parameter.Value;
  }
}
export default SystemManagerRepository;