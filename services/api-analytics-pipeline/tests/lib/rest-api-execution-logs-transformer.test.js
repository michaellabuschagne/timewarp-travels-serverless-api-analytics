import chai from "chai";
import sinonChai from "sinon-chai";
import deepEqualInAnyOrder from "deep-equal-in-any-order";

const { expect } = chai;
chai.use(sinonChai);
chai.use(deepEqualInAnyOrder);

import { transformApiGatewayExecutionLogEvent } from "../../src/lib/rest-api-execution-logs-transformer";

describe("execution logs transform", function() {
  it("Correctly returns even data for query string log line", function() {
    const queryStringLog = {
      id: "32323296440606839349017588591473536490790880325737381891",
      timestamp: 1680997508000,
      message:
        "(0e109eae-d723-11ed-9703-263563b74b58) Method request query string: {test=1, test2=someval}"
    };
    const eventDataExpectedOutput = `{"queryString":{"test":1,"test2":"someval"},"timestamp":1680997508000,"requestId":"0e109eae-d723-11ed-9703-263563b74b58"}\n`;
    const parsedLog = transformApiGatewayExecutionLogEvent(queryStringLog);
    return parsedLog.then(result =>
      expect(result).to.deep.equalInAnyOrder(eventDataExpectedOutput)
    );
  });
  it("Correctly returns an empty string when cannot match event", function() {
    const unmatchedEventLog = {
      id: "66323296445539967113421996722048939335972935242219440641",
      timestamp: 1628792944683,
      message:
        "(0e109eae-d723-11ed-9703-263563b74b58) Extended Request Id: G72RpYd-JKQW8xL="
    };
    const eventDataExpectedOutput = ``;
    const parsedLog = transformApiGatewayExecutionLogEvent(unmatchedEventLog);
    return parsedLog.then(result =>
      expect(result).to.deep.equalInAnyOrder(eventDataExpectedOutput)
    );
  });
});
