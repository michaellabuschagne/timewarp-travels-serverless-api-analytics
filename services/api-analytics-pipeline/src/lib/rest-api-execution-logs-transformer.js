const parser = require("json-ast").parse;
const AST = require("json-ast").AST;

const requestIdRegex = /[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/;
const queryStringRegex = /(Method request query string:\s)({.*?})/;

const tolerantJsonParser = jsonString => {
  const ast = parser(jsonString, { verbose: true, junker: true });
  return AST.JsonNode.toJSON(ast);
};

export const transformApiGatewayExecutionLogEvent = logEvent => {
  let requiredEventData;

  console.debug(`log event -> ${JSON.stringify(logEvent)}`);
  if (queryStringRegex.test(logEvent.message)) {
    console.debug(`Found matching queryString type event`);
    const queryString = tolerantJsonParser(
      [...logEvent.message.match(queryStringRegex)][2].replace(/=/g, ":")
    );
    requiredEventData = { queryString };
  }
  if (requiredEventData) {
    requiredEventData.timestamp = logEvent.timestamp;
    requiredEventData.requestId = logEvent.message.match(requestIdRegex)[0];
  }
  requiredEventData
    ? console.log(
        `Adding event to batch ${JSON.stringify(
          requiredEventData
        )}`
      )
    : console.log(`Nothing matched, doing nothing...`);
  return Promise.resolve(
    requiredEventData ? `${JSON.stringify(requiredEventData)}\n` : ``
  );
};
