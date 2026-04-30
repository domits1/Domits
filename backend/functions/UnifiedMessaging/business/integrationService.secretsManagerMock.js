function MockSecretsCommand(input = {}) {
  this.input = input;
}

module.exports = {
  SecretsManagerClient: class {
    send() {
      return Promise.resolve({});
    }
  },
  CreateSecretCommand: MockSecretsCommand,
  PutSecretValueCommand: MockSecretsCommand,
  GetSecretValueCommand: MockSecretsCommand,
  DescribeSecretCommand: MockSecretsCommand,
  DeleteSecretCommand: MockSecretsCommand,
};
