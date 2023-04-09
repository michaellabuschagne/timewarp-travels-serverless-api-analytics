import { transformApiGwAccessLog } from "../lib/rest-api-access-logs-transformer";
import { kinesisTransformer } from "../lib/kinesis-stream-base-transformer";

export const index = (event, context, callback) =>
  kinesisTransformer(
    event,
    context,
    callback,
    transformApiGwAccessLog
  );
