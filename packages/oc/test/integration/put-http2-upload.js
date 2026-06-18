const fs = require('fs-extra');
const http2 = require('node:http2');
const os = require('node:os');
const path = require('node:path');
const expect = require('chai').expect;

const put = require('../../dist/utils/put').default;

// Self-signed cert (CN=localhost, valid until 2126) used only by this test so
// it can stand up a real TLS server that negotiates HTTP/2 via ALPN.
const KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDYCHTuXyoN/Fkv
BiLJP65CIKgD6FWIV11i16G84ZC2CA4LwyL4fzn5JTvEVW17pfFBaK/Gx9YcyHYU
GZhZW9mxTdy4xHsliCDhLjPFnyLDrGD/MEhJlYX1KSMWyXYX4RYCqjTNbPYvq8WY
eXLp3Oyad2JfGyfR8eSpvV8qn6zqrpF2TwKjNz4gmdEiid8r5fquqkh1QepmpH2J
PKiiWCwqdNIKxrO3Suc8n1Pi3EjdkuM0cWHt+CJ0u6Nc/v7KxCBTOKftr/llf7Iu
nFK5T2ivtskxFWdvsvh0HeAex3qe6czQq5DtD+Hv6y9vCc78sGZNs/1MHJoM7vP1
ui1NOH2HAgMBAAECggEAQcdZa1d4o6eJtELHBsYoFiSBZCczG/+WBMmpiqyX9oU/
WZ+CH24FxfHrX92vJ24gpozssLcaX8s+AOLGO7c28sDFi1DwOj5X3JjH1M2etTvg
kPMvn5AyqLJs57xSA/VaUVdoGoCp+VvxH3sjXUgSlvnw7wqCtm9T88cgmgbijNYp
Z5o9REdBtD+xe4H5zUYJr5XMPMEHO0XjfKUmF7fTB81KfgKmGjGdDkUfOUQ3R1k5
aNJpwLDoozEtNJMqz26crqKIVvk63rI650fHmQG8PjIM6hS66nUoVFyzicr+V9f8
zWrJ9UDevX09y4v8aOV8O+s9P7Wv6Hbg1W+8/BqSUQKBgQDsSyGOCTTLGywOV1r1
lQXsfnUXbL1ZC6qjwfTAjMluIlxUQUBQiw4HNlNSVJKkMc9Iz8g/6It8Wsa9+nUc
EdJAHRPWA33jd0jRImH3lLKJpfzzoLKyoNrsVwq3TGyCxSExCFg3htAHvO+7vE9l
I0SrBA+iwfOfl+i28oLE7RXVDwKBgQDqDMPPuzDtsnjjEYsvv0nHU5VlwLlfIGKQ
Hv8bK6Ma3bfCCGxOC7HR4Dfyvw6wB7O8pUt2RFq1ucSnhv5UC4GIMIJbBfMzWRpq
vwptz89JFRAYF8Kj/KelkNeVX4sCsXVQs+uLymgVcDBhVHbollB7PaQVBU4fcNhL
WegU2UwACQKBgQCNWoCPPHili/K1/ZH/WY+6owee5MD81NrWrb+htFcHmGyNRp+X
zyesLtZ3aPp0WQu8bfhIKu/Oi2ta2MpX6V1SV1K3c01K1t/ro9rhRcXsTCze/WIJ
M+ri+UsCzigXrp+lem1zgiVOi7sKHqOMSCXa/EnyPn5kGXbwgnCyJ3YpBwKBgDKI
iwag/hF0RVGRiiHHBWD6FPmhQOTfEyjW6HGvXEoCsRg9xVSchcowxSOuSLeNEiua
7M4eOA+gims5ZFQ1H8SN5LdOc5IUnPWLRe8rvS+kUpNBHg9WD8RZn5JqzJLKSfAg
yKyoCQ0H6go5uGrDeaECUBkRyipTrP+n68oEmLoxAoGBAMAfvtJtWJd288oFz26f
67yWU6XwnnNxTxazInNyVoYX/tZYt1fVHKr8+4idUmqLQ7MiOiFZlBrw1u8eJbDu
wRqpzE8GTjY6AZmODpeUt9nF1bYVN4roSdQK5HSg8Okm8Zis4USBq8+lUivkgJon
wPIo7M+pggaUyZ6rjndQs4Xq
-----END PRIVATE KEY-----`;

const CERT = `-----BEGIN CERTIFICATE-----
MIIDCzCCAfOgAwIBAgIUfxytagY5aIy4moX1aFHftydWJTEwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MDYxODA5MDEzM1oYDzIxMjYw
NTI1MDkwMTMzWjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQDYCHTuXyoN/FkvBiLJP65CIKgD6FWIV11i16G84ZC2
CA4LwyL4fzn5JTvEVW17pfFBaK/Gx9YcyHYUGZhZW9mxTdy4xHsliCDhLjPFnyLD
rGD/MEhJlYX1KSMWyXYX4RYCqjTNbPYvq8WYeXLp3Oyad2JfGyfR8eSpvV8qn6zq
rpF2TwKjNz4gmdEiid8r5fquqkh1QepmpH2JPKiiWCwqdNIKxrO3Suc8n1Pi3Ejd
kuM0cWHt+CJ0u6Nc/v7KxCBTOKftr/llf7IunFK5T2ivtskxFWdvsvh0HeAex3qe
6czQq5DtD+Hv6y9vCc78sGZNs/1MHJoM7vP1ui1NOH2HAgMBAAGjUzBRMB0GA1Ud
DgQWBBTQGrBu85wb25CuMwlNeHClX9blMDAfBgNVHSMEGDAWgBTQGrBu85wb25Cu
MwlNeHClX9blMDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBI
NrNfWDSOwfcWrsaQuTNcolfNuJx1U/6AIaPyHWjBdpKgrDvmaJmXt8oBuTDb4Q71
WzmQiJflSf1MF+GHOZ1iTxld3qOttnyAEgKs32yEA0m9GpWOW5GLqAQZkITsodKs
lgPMZAyYmRoH0irapXW3cGISib79iHb7SHU+5rRiihcMDtbSSwyZuJW6YcGWXR+t
onkSi8J3YgG54trph+Zt/vzxcX++EjZleCGxNMOjWd4AYKVloDvoe2oH9qJzwm1H
sKeDkGhmGjfwMGwTjy6DCGS01BwNUrPr3zvPzq1hL5+YPs6AN2SzewQ4IMJOo10o
q6nrKhOX1H+9kx0W7Cf5
-----END CERTIFICATE-----`;

describe('utils : put', () => {
  // Simulates an Azure App Service style edge: HTTP/2 enabled and reachable via
  // ALPN, but it resets streamed uploads received over h2 (the bug we hit),
  // while answering 200 over HTTP/1.1.
  describe('when the registry edge resets streamed uploads over HTTP/2', () => {
    let server;
    let tempFile;
    let registryUrl;
    let protocols;
    let previousTlsReject;

    before((done) => {
      previousTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      // The test server uses a self-signed cert; let undici connect to it.
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

      tempFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'oc-put-')),
        'package.tar.gz'
      );
      fs.writeFileSync(tempFile, Buffer.from('a'.repeat(64 * 1024)));

      protocols = [];
      server = http2.createSecureServer({
        key: KEY,
        cert: CERT,
        allowHTTP1: true
      });

      server.on('request', (req, res) => {
        protocols.push(req.httpVersion);
        if (req.httpVersion === '2.0') {
          // Reset the upload mid-flight, reproducing the gateway behaviour
          // that surfaces as "Premature close" on the client.
          req.stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR);
          return;
        }
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('published');
      });

      server.listen(0, '127.0.0.1', () => {
        registryUrl = `https://localhost:${server.address().port}/component/1.0.0`;
        done();
      });
    });

    after((done) => {
      if (previousTlsReject === undefined) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsReject;
      }
      fs.removeSync(path.dirname(tempFile));
      server.close(done);
    });

    it('uploads successfully by falling back to HTTP/1.1', async () => {
      const response = await put(registryUrl, tempFile, {});

      expect(response).to.equal('published');
      // Proves the upload really avoided the h2 path that the server rejects.
      expect(protocols).to.eql(['1.1']);
    });
  });
});
