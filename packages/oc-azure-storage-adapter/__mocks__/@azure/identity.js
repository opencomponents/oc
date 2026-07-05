class DefaultAzureCredential {
  async getToken() {
    return { token: 'token', expiresOnTimestamp: Date.now() + 3600000 };
  }
}

module.exports = {
  DefaultAzureCredential
};
