import { SSMClient, GetParameterCommand, PutParameterCommand } from "@aws-sdk/client-ssm";

const client = new SSMClient({ region: process.env.AWS_REGION || "eu-central-1" });

export class SystemManagerRepository {
  async getParameter(name) {
    const cmd = new GetParameterCommand({ Name: name, WithDecryption: true });
    const res = await client.send(cmd);
    return res.Parameter?.Value ?? null;
  }

  async putParameter(name, value) {
    const cmd = new PutParameterCommand({
      Name:      name,
      Value:     value,
      Type:      "SecureString",
      Overwrite: true,
    });
    await client.send(cmd);
  }
}
