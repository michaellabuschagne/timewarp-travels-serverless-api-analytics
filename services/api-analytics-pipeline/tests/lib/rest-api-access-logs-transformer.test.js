import chai from "chai";
import sinonChai from "sinon-chai";
import deepEqualInAnyOrder from "deep-equal-in-any-order";

const { expect } = chai;
chai.use(sinonChai);
chai.use(deepEqualInAnyOrder);

import { transformApiGwAccessLog } from "../../src/lib/rest-api-access-logs-transformer";

describe("api gateway access log transformer", function() {
  it("should sanitize logs", function() {
    const logEvent = {
      id: "57382645913408672841345623784916290465789312605733847213",
      timestamp: 1680997508004,
      message:
        '{"requestId":"9be82ea4-d723-11ed-a76f-263563b74b58","accountId":"123456789012","httpStatusCode":"200","apiId":"yb628s4k9t","domainName":"api.timewarptravels.com","extendedRequestId":"Fkb1_JtoKANExCk=","httpMethod":"GET","resourcePath":"/v1/booking-service","protocol":"HTTP/1.1","requestTimeEpoch":"1680997508004","stage":"main","responseLatency":"23","responseLength":"9","xrayTraceId":"-","webaclArn":"-","authorizer":{"principalId":"eca065fa-d723-11ed-96c7-263563b74b58","error":"-","latency":"0","requestId":"-","status":"200"},"authorize":{"error":"-","latency":"0","status":"200"},"error":{"errorMessage":"-","errorResponseType":"-"},"identity":{"sourceIp":"99.0.128.123","userAgent":"Mozilla/5.0 (apple-x86_64-darwin20.4.0) Siege/4.1.6"},"authenticate":{"error":"-","latency":"-","status":"-"},"integration":{"error":"-","integrationStatus":"200","latency":"48","requestId":"1c7e4602-d724-11ed-82dc-263563b74b58","status":"200"},"waf":{"error":"-","latency":"-","status":"-","responseCode":"-"}}'
    };
    const expectedOutput = `{"requestId":"9be82ea4-d723-11ed-a76f-263563b74b58","accountId":"123456789012","httpStatusCode":"200","apiId":"yb628s4k9t","domainName":"api.timewarptravels.com","extendedRequestId":"Fkb1_JtoKANExCk=","httpMethod":"GET","resourcePath":"/v1/booking-service","protocol":"HTTP/1.1","requestTimeEpoch":"1680997508004","stage":"main","responseLatency":"23","responseLength":"9","xrayTraceId":"","webaclArn":"","authorizer":{"principalId":"eca065fa-d723-11ed-96c7-263563b74b58","error":"","latency":"0","requestId":"","status":"200"},"authorize":{"error":"","latency":"0","status":"200"},"error":{"errorMessage":"","errorResponseType":""},"identity":{"sourceIp":"99.0.128.123","userAgent":"Mozilla/5.0 (apple-x86_64-darwin20.4.0) Siege/4.1.6"},"authenticate":{"error":"","latency":"","status":""},"integration":{"error":"","integrationStatus":"200","latency":"48","requestId":"1c7e4602-d724-11ed-82dc-263563b74b58","status":"200"},"waf":{"error":"","latency":"","status":"","responseCode":""}}\n`;
    return transformApiGwAccessLog(logEvent).then(result => {
      expect(result).to.deep.equalInAnyOrder(expectedOutput);
    });
  });
  it("should handle empty log message", function() {
    const logMessage = "";
    return transformApiGwAccessLog(logMessage).then(result => {
      expect(result).to.equal("");
    });
  });
  it("should handle malformed log message", function() {
    const malformedLogEvent = {
      id: "57382645913408672841345623784916290465789312605733847213",
      timestamp: 1680997508004,
      message:
        '{9be82ea4-d723-11ed-a76f-263563b74b58","httpStatusCode":"200", "domain": "api.timewarptravels.com":"GET","resourcePath/booking-service","protocol":"HTTP/1.1","requestTimeEpoch":"1680997508004","stage":"main","responseLatency":"23","responseLength":"9","xrayTraceId":"-","webaclArn":"-","authorizer":{"principalId":"eca065fa-d723-11ed-96c7-263563b74b58","error":"-","latency":"0","requestId":"-","status":"200"},"authorize":{"error":"-","latency":"0","status":"200"},"error":{"errorMessage":"-","errorResponseType":"-"},"identity":{"sourceIp":"99.0.128.123","userAgent":"Mozilla/5.0 (apple-x86_64-darwin20.4.0) Siege/4.1.6"},"authenticate":{"error":"-","latency":"-","status":"-"},"integration":{"error":"-","integrationStatus":"200","latency":"48","requestId":"1c7e4602-d724-11ed-82dc-263563b74b58","status":"200"},"waf":{"e":"-"}}'
    };
    return transformApiGwAccessLog(malformedLogEvent).then(result => {
      expect(result).to.equal("");
    });
  });
});
