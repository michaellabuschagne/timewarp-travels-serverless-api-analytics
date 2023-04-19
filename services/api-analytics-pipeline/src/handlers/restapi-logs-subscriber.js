import { SSMClient } from "@aws-sdk/client-ssm";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

import {
  getSsmParameter,
  determineLogGroupsSubscriptionFilters,
  subscribeLogGroup
} from "../lib/cloudwatch-logs-kinesis-subscriber";

const REGION = "us-east-1";
const ssmClient = new SSMClient({ region: REGION });
const cloudwatchLogsClient = new CloudWatchLogsClient({ region: REGION });

const cloudwatchKinesisRoleArnParamName =
  "/product/analytics/cloudwatch-kinesis-role-arn";
const execLogsKinesisArnParamName =
  "/product/analytics/execution-logs/kinesis-delivery-stream-arn";
const accessLogsKinesisArnParamName =
  "/product/analytics/access-logs/kinesis-delivery-stream-arn";

const subscribeLogGroupsApiAnalytics = async (
  logGroupsSubscriptionInfo,
  cloudwatchKinesisRoleArn,
  cloudwatchLogsClient
) => {
  for (const { logGroupName, deliveryStreamArn } of logGroupsSubscriptionInfo) {
    console.log(`Subscribing [${logGroupName}][${deliveryStreamArn}]`);
    await subscribeLogGroup(
      logGroupName,
      deliveryStreamArn,
      cloudwatchKinesisRoleArn,
      cloudwatchLogsClient
    );
  }
};

export const index = async () => {
  const cloudwatchKinesisRoleArn = await getSsmParameter(
    cloudwatchKinesisRoleArnParamName,
    ssmClient
  );
  console.log(
    `SSM Param retrieved -> CloudWatch logs to Kinesis IAM Role ARN ${cloudwatchKinesisRoleArn}`
  );
  const execDeliveryStreamArn = await getSsmParameter(
    execLogsKinesisArnParamName,
    ssmClient
  );
  console.log(
    `SSM Param retrieved -> Got Execution Log Kinesis Data Firehose Delivery Stream ARN ${execDeliveryStreamArn}`
  );
  const accessDeliveryStreamArn = await getSsmParameter(
    accessLogsKinesisArnParamName,
    ssmClient
  );
  console.log(
    `SSM Param retrieved -> Got Access Log Kinesis Data Firehose Delivery Stream ARN ${accessDeliveryStreamArn}`
  );
  const logGroupsToSubscribe = await determineLogGroupsSubscriptionFilters(
    execDeliveryStreamArn,
    accessDeliveryStreamArn,
    cloudwatchLogsClient
  );
  console.log(
    `determineLogGroupsSubscriptionFilters ${JSON.stringify(logGroupsToSubscribe)}`
  );
  await subscribeLogGroupsApiAnalytics(
    logGroupsToSubscribe,
    cloudwatchKinesisRoleArn,
    cloudwatchLogsClient
  );
};
