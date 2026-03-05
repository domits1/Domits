import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { isTestMode } from "../../../../util/isTestMode.js";

export class SystemManagerRepository {

    ssmClient = new SSMClient({region: "eu-north-1"})

    async getSystemManagerParameter(parameterName) {
        // In TEST mode, return a placeholder value without calling SSM
        if (isTestMode()) {
            return "test-value";
        }

        const params = new GetParameterCommand({
            "Name": parameterName,
            "WithDecryption": false
        });
        const result = await this.ssmClient.send(params);
        return result.Parameter.Value;
    }
}
