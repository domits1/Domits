import * as readline from "readline";
import {LambdaClient, GetFunctionCommand, CreateFunctionCommand, AddPermissionCommand} from "@aws-sdk/client-lambda";
import {
    APIGatewayClient,
    CreateRestApiCommand,
    GetResourcesCommand,
    PutMethodCommand,
    PutIntegrationCommand,
    CreateDeploymentCommand
} from "@aws-sdk/client-api-gateway";
import * as fs from "fs/promises";
import * as zip from "zip-lib";
import {exec} from "child_process";
import {promisify} from "util";
import {STSClient, GetCallerIdentityCommand} from "@aws-sdk/client-sts";

const execAsync = promisify(exec);
const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

class LambdaFactory {
    constructor() {
        this.lambdaClient = new LambdaClient({});
        this.apiGatewayClient = new APIGatewayClient({});
    }

    async create() {
        readlineInterface.question("What will your lambda function be called? \n", async name => {
            try {
                if (await this.doesLambdaFunctionExist(name)) {
                    console.error('\x1b[31m%s\x1b[0m', "\n[ERROR] This function already exists, please try again.\n");
                    return this.create();
                }

                await this.prepareFunctionDirectories(name);
                await this.installDependencies(name);

                const lambdaFunction = await this.createLambdaFunction(name);

                await this.createApiGateway(name, lambdaFunction);

                await this.cleanUp(name);

                console.log("\n\x1b[32m%s\x1b[0m", "All steps were completed successfully,");
                console.log("\n\x1b[32m%s\x1b[0m", "please familiarize yourself with the architecture and structure before starting to code.");

                readlineInterface.close();
            } catch (error) {
                console.error('\x1b[31m%s\x1b[0m', error.message);
                console.error('\n\x1b[31m%s\x1b[0m', "[ERROR] Something went wrong.");
                console.error('\n\x1b[31m%s\x1b[0m', "Your function may not have been properly registered.");
                console.error('\n\x1b[31m%s\x1b[0m', "Please remove all traces of the function in API Gateway, Lambda and local.\n");
                console.error("\n\x1b[33m", "If this keeps happening, please manually create your directories,");
                console.error("\n\x1b[33m", "or ask a senior for help.");
                readlineInterface.close();
            }
        })
    }

    async doesLambdaFunctionExist(name) {
        try {
            await this.lambdaClient.send(new GetFunctionCommand({FunctionName: name}));
            return true;
        } catch (error) {
            if (error.name === "ResourceNotFoundException") return false;
            throw error;
        }
    }

    async prepareFunctionDirectories(name) {
        console.log("\n\x1b[33m", `Preparing directories for function: ${name}...`);
        const functionPath = `functions/${name}`;
        await fs.cp("CD/template/function", functionPath, {recursive: true});
        await fs.cp("CD/template/events", `events/${name}`, {recursive: true});
        await fs.cp("CD/template/test", `test/${name}`, {recursive: true});
        await fs.copyFile("package.json", `${functionPath}/package.json`);
        await fs.copyFile("package-lock.json", `${functionPath}/package-lock.json`);
        await fs.writeFile(`${functionPath}/metadata.json`, `{ "functionName": "${name}" }`);
        console.log("\n\x1b[32m%s\x1b[0m", `Directories created successfully.`);
    }

    async installDependencies(name) {
        console.log("\n\x1b[33m", `Preparing lambda dependencies for function: ${name}...`);
        await execAsync("npm ci", {cwd: `functions/${name}`});
        await fs.rm(`functions/${name}/package-lock.json`);
        console.log("\n\x1b[32m%s\x1b[0m", `Lambda dependencies created successfully.`);
    }

    async createLambdaFunction(name) {
        console.log("\n\x1b[33m", `Registering function: ${name}, to AWS Lambda...`);
        const folder = `functions/${name}`;
        const zipFileName = "function.zip";

        await zip.archiveFolder(folder, zipFileName);
        const zipBuffer = await fs.readFile(zipFileName);

        const lambdaFunction = await this.lambdaClient.send(new CreateFunctionCommand({
            FunctionName: name,
            Runtime: "nodejs22.x",
            Role: "arn:aws:iam::115462458880:role/General-Lambda-Function",
            Handler: "index.handler",
            Timeout: 10,
            Code: {ZipFile: zipBuffer},
        }));
        console.log("\n\x1b[32m%s\x1b[0m", `Lambda function ${name} was created successfully.`);
        return lambdaFunction.FunctionArn;
    }

    async createApiGateway(name, lambdaArn) {
        console.log("\n\x1b[33m", `Registering ${name}, to API Gateway...`);
        const apiResponse = await this.apiGatewayClient.send(new CreateRestApiCommand({
            name: name,
            endpointConfiguration: {
                types: ["REGIONAL"]
            }
        }));
        const api = apiResponse.id;

        const resources = await this.apiGatewayClient.send(new GetResourcesCommand({
            restApiId: api,
        }));
        const rootResource = resources.items.find(r => r.path === "/").id;

        await this.apiGatewayClient.send(new PutMethodCommand({
            restApiId: api,
            resourceId: rootResource,
            httpMethod: "ANY",
            authorizationType: "NONE",
        }));

        await this.apiGatewayClient.send(new PutIntegrationCommand({
            restApiId: api,
            resourceId: rootResource,
            httpMethod: "ANY",
            type: "AWS_PROXY",
            integrationHttpMethod: "POST",
            uri: `arn:aws:apigateway:eu-north-1:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`,
        }));

        await this.lambdaClient.send(new AddPermissionCommand({
            Action: "lambda:InvokeFunction",
            FunctionName: name,
            Principal: "apigateway.amazonaws.com",
            StatementId: `${name}-InvokePermission`,
            SourceArn: `arn:aws:execute-api:eu-north-1:${await this.getAccountId()}:${api}/*/*/`,
        }));

        await this.apiGatewayClient.send(new CreateDeploymentCommand({
            restApiId: api,
            stageName: "default",
        }));

        console.log("\n\x1b[32m%s\x1b[0m", `API Gateway ${name} was created successfully.`);
        console.log("\n\x1b[33m", `Test it out at: https://${api}.execute-api.eu-north-1.amazonaws.com/default`);
        console.log("\n\x1b[33m", "**Note** The above link will return an error as you are not providing an auth token and id.");
    }

    async getAccountId() {
        const sts = new STSClient({});
        const identity = await sts.send(new GetCallerIdentityCommand({}));
        return identity.Account;
    }

    async cleanUp(name) {
        console.log("\n\x1b[33m", `Cleaning up directories...`);
        console.log("\n\x1b[33m", `Removing function-level node-modules from: ${name}`);
        await fs.rm(`functions/${name}/node_modules`, {recursive: true});
        console.log("\n\x1b[32m%s\x1b[0m", `Function-level node-modules from: ${name}, were removed successfully.`);

        console.log("\n\x1b[33m", `Removing function.zip, if this gives an error, remove function.zip manually and you are done.`);
        await fs.rm("function.zip", {recursive: true});
        console.log("\n\x1b[32m%s\x1b[0m", `Zip-file: function.zip, was removed successfully.`);
    }
}

new LambdaFactory().create();
