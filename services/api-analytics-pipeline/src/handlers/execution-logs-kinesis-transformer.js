import { transformApiGatewayExecutionLogEvent } from "../lib/rest-api-execution-logs-transformer";
import { kinesisTransformer } from "../lib/kinesis-stream-base-transformer";

export const index = (event, context, callback) =>
  kinesisTransformer(
    event,
    context,
    callback,
    transformApiGatewayExecutionLogEvent
  );
