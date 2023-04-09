/*
For processing data sent to Firehose by Cloudwatch Logs subscription filters.

Cloudwatch Logs sends to Firehose records that look like this:

{
  "messageType": "DATA_MESSAGE",
  "owner": "123456789012",
  "logGroup": "log_group_name",
  "logStream": "log_stream_name",
  "subscriptionFilters": [
    "subscription_filter_name"
  ],
  "logEvents": [
    {
      "id": "01234567890123456789012345678901234567890123456789012345",
      "timestamp": 1510109208016,
      "message": "log message 1"
    },
    {
      "id": "01234567890123456789012345678901234567890123456789012345",
      "timestamp": 1510109208017,
      "message": "log message 2"
    }
    ...
  ]
}

The data undergoes further compression using GZIP.

IMPORTANT: It's recommended to test the CloudWatch Logs Processor Lambda function in a pre-production setting to confirm that the 6,000,000 limit meets your needs. If your data has a significant number of records classified as Dropped/ProcessingFailed, consider reducing the limit to a smaller value (e.g., 5,000,000) to adhere to the 6MB (6,291,456 bytes) payload restriction imposed by Lambda. Lambda quotas can be found at https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html.

The following code will:

    1 - Decompress the data using gunzip.
    2 - Parse the JSON.
    3 - Set the result to ProcessingFailed for records with a messageType other than DATA_MESSAGE, redirecting them to the processing error output. These records do not contain log events. To completely remove these records, modify the code to set the result to Dropped.
    4 - For records with a DATA_MESSAGE messageType, extract individual log events from the logEvents field and pass each one to the transformLogEvent method. You can adjust the transformLogEvent method for custom log event transformations.
    5 - Combine the results from (4) and set the resulting data for the record returned to Firehose. Note that this step does not include delimiters. Delimiters should be appended in the transformLogEvent method.
    6 - Any individual record exceeding 6,000,000 bytes after decompression and encoding is marked as ProcessingFailed within the function. The original compressed record will be backed up to the configured S3 bucket on the Firehose.
    7 - Any additional records surpassing 6MB will be re-ingested into Firehose.
    8 - The retry count for temporary failures during re-ingestion is set to 20 attempts. To decrease the number of retries for such failures, you can lower this value.

*/
import zlib from "zlib";
import {
  PutRecordBatchCommand,
  FirehoseClient
} from "@aws-sdk/client-firehose";
import { PutRecordsCommand, KinesisClient } from "@aws-sdk/client-kinesis";

/**
 * logEvent has this format:
 *
 * {
 *   "id": "01234567890123456789012345678901234567890123456789012345",
 *   "timestamp": 1510109208016,
 *   "message": "log message 1"
 * }
 *
 * The default implementation below just extracts the message and appends a newline to it.
 *
 * The result must be returned in a Promise.
 */

const transformLogEvent = transformer => logEvent => transformer(logEvent);

async function putRecordsToFirehoseStream(
  streamName,
  records,
  client,
  resolve,
  reject,
  attemptsMade,
  maxAttempts
) {
  try {
    const response = await client.send(
      new PutRecordBatchCommand({
        DeliveryStreamName: streamName,
        Records: records
      })
    );
    const failed = response.RequestResponses.filter(r => r.ErrorCode);
    if (failed.length > 0) {
      if (attemptsMade + 1 < maxAttempts) {
        console.log(
          "Some records failed while calling PutRecordBatch, retrying."
        );
        putRecordsToFirehoseStream(
          streamName,
          failed,
          client,
          resolve,
          reject,
          attemptsMade + 1,
          maxAttempts
        );
      } else {
        reject(`Could not put records after ${maxAttempts} attempts.`);
      }
    } else {
      resolve("");
    }
  } catch (err) {
    reject(err.message);
  }
}

async function putRecordsToKinesisStream(
  streamName,
  records,
  client,
  resolve,
  reject,
  attemptsMade,
  maxAttempts
) {
  try {
    const response = await client.send(
      new PutRecordsCommand({
        StreamName: streamName,
        Records: records
      })
    );
    const failed = response.Records.filter(r => r.ErrorCode);
    if (failed.length > 0) {
      if (attemptsMade + 1 < maxAttempts) {
        console.log("Some records failed while calling PutRecords, retrying.");
        putRecordsToKinesisStream(
          streamName,
          failed,
          client,
          resolve,
          reject,
          attemptsMade + 1,
          maxAttempts
        );
      } else {
        reject(`Could not put records after ${maxAttempts} attempts.`);
      }
    } else {
      resolve("");
    }
  } catch (err) {
    reject(err.message);
  }
}

function createReingestionRecord(isSas, originalRecord) {
  if (isSas) {
    return {
      Data: Buffer.from(originalRecord.data, "base64"),
      PartitionKey: originalRecord.kinesisRecordMetadata.partitionKey
    };
  } else {
    return {
      Data: Buffer.from(originalRecord.data, "base64")
    };
  }
}

function getReingestionRecord(isSas, reIngestionRecord) {
  if (isSas) {
    return {
      Data: reIngestionRecord.Data,
      PartitionKey: reIngestionRecord.PartitionKey
    };
  } else {
    return {
      Data: reIngestionRecord.Data
    };
  }
}

export const kinesisTransformer = (event, context, callback, transformer) => {
  Promise.all(
    event.records.map(r => {
      const buffer = Buffer.from(r.data, "base64");

      let decompressed;
      try {
        decompressed = zlib.gunzipSync(buffer);
      } catch (e) {
        return Promise.resolve({
          recordId: r.recordId,
          result: "ProcessingFailed"
        });
      }

      const data = JSON.parse(decompressed);
      // CONTROL_MESSAGE are sent by CWL to check if the subscription is reachable.
      // They do not contain actual data.
      if (data.messageType === "CONTROL_MESSAGE") {
        return Promise.resolve({
          recordId: r.recordId,
          result: "Dropped"
        });
      } else if (data.messageType === "DATA_MESSAGE") {
        const promises = data.logEvents.map(transformLogEvent(transformer));
        return Promise.all(promises).then(transformed => {
          const payload = transformed.reduce((a, v) => a + v, "");
          const encoded = Buffer.from(payload).toString("base64");
          if (encoded.length <= 6000000) {
            return {
              recordId: r.recordId,
              result: "Ok",
              data: encoded
            };
          } else {
            return {
              recordId: r.recordId,
              result: "ProcessingFailed"
            };
          }
        });
      } else {
        return Promise.resolve({
          recordId: r.recordId,
          result: "ProcessingFailed"
        });
      }
    })
  )
    .then(recs => {
      const isSas = Object.prototype.hasOwnProperty.call(
        event,
        "sourceKinesisStreamArn"
      );
      const streamARN = isSas
        ? event.sourceKinesisStreamArn
        : event.deliveryStreamArn;
      const region = streamARN.split(":")[3];
      const streamName = streamARN.split("/")[1];
      const result = { records: recs };
      let recordsToReingest = [];
      const putRecordBatches = [];
      let totalRecordsToBeReingested = 0;
      const inputDataByRecId = {};
      event.records.forEach(
        r => (inputDataByRecId[r.recordId] = createReingestionRecord(isSas, r))
      );

      let projectedSize = recs
        .filter(rec => rec.result === "Ok")
        .map(r => r.recordId.length + r.data.length)
        .reduce((a, b) => a + b, 0);
      // 6000000 instead of 6291456 to leave ample headroom for the stuff we didn't account for

      for (
        let idx = 0;
        idx < event.records.length && projectedSize > 6000000;
        idx++
      ) {
        const rec = result.records[idx];
        if (rec.result === "Ok") {
          totalRecordsToBeReingested++;
          recordsToReingest.push(
            getReingestionRecord(isSas, inputDataByRecId[rec.recordId])
          );
          projectedSize -= rec.data.length;
          delete rec.data;
          result.records[idx].result = "Dropped";

          // split out the record batches into multiple groups, 500 records at max per group
          if (recordsToReingest.length === 500) {
            putRecordBatches.push(recordsToReingest);
            recordsToReingest = [];
          }
        }
      }

      if (recordsToReingest.length > 0) {
        // add the last batch
        putRecordBatches.push(recordsToReingest);
      }

      if (putRecordBatches.length > 0) {
        new Promise((resolve, reject) => {
          let recordsReingestedSoFar = 0;
          for (let idx = 0; idx < putRecordBatches.length; idx++) {
            const recordBatch = putRecordBatches[idx];
            if (isSas) {
              const client = new KinesisClient({ region: region });
              putRecordsToKinesisStream(
                streamName,
                recordBatch,
                client,
                resolve,
                reject,
                0,
                20
              );
            } else {
              const client = new FirehoseClient({ region: region });
              putRecordsToFirehoseStream(
                streamName,
                recordBatch,
                client,
                resolve,
                reject,
                0,
                20
              );
            }
            recordsReingestedSoFar += recordBatch.length;
            console.log(
              "Reingested %s/%s records out of %s in to %s stream",
              recordsReingestedSoFar,
              totalRecordsToBeReingested,
              event.records.length,
              streamName
            );
          }
        }).then(
          () => {
            console.log(
              "Reingested all %s records out of %s in to %s stream",
              totalRecordsToBeReingested,
              event.records.length,
              streamName
            );
            callback(null, result);
          },
          failed => {
            console.error("Failed to reingest records. %s", failed);
            callback(failed, null);
          }
        );
      } else {
        console.log("No records needed to be reingested.");
        callback(null, result);
      }
    })
    .catch(ex => {
      console.error("Error: ", ex);
      callback(ex, null);
    });
};
