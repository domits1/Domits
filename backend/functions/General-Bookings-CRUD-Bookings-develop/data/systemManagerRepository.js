import {GetParameterCommand, SSMClient} from "@aws-sdk/client-ssm";

class SystemManagerRepository {

    ssmClient = new SSMClient({region: "eu-north-1"})

    async getSystemManagerParameter(parameterName) {
        const params = new GetParameterCommand({
            "Name": parameterName,
            "WithDecryption": false
        });
        const result = await this.ssmClient.send(params);
        console.log("SSM parameter retrieved:", result);
        return result.Parameter.Value;
    }
}
export default SystemManagerRepository;