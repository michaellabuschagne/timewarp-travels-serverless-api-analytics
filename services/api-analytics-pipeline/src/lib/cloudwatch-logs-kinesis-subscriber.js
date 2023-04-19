import { GetParameterCommand } from "@aws-sdk/client-ssm";
import {
  DescribeLogGroupsCommand,
  DescribeSubscriptionFiltersCommand,
  PutSubscriptionFilterCommand
} from "@aws-sdk/client-cloudwatch-logs";

export const getSsmParameter = (ssmParamName, ssm) => {
  const params = {
    Name: ssmParamName
  };
  return ssm
    .send(new GetParameterCommand(params))
    .then(
      result =>
        console.log(
          `getSsmParameter [${ssmParamName}] => [${result.Parameter.Value}]`
        ) || result.Parameter.Value
    )
    .catch(err => console.error(err) || err);
};

export const describeLogsGroupsFilterByPrefix = (
  cloudwatchlogs,
  logGroupNamePrefix,
  paginationToken,
  allLogGroupNamesTemp = []
) => {
  console.log(`logGroupNamePrefix ${logGroupNamePrefix}`);
  console.log(`paginationToken ${paginationToken}`);
  console.log(`allLogGroupNamesTemp.length ${allLogGroupNamesTemp.length}`);
  const params = {
    logGroupNamePrefix,
    nextToken: paginationToken
  };
  return cloudwatchlogs
    .send(new DescribeLogGroupsCommand(params))
    .then(result => {
      console.debug(`DescribedLogGroupsCommand output ->`, result);
      const allLogGroupNames = allLogGroupNamesTemp.concat(
        result.logGroups.map(item => item.logGroupName)
      );
      const nextToken = result.nextToken;
      if (nextToken) {
        return describeLogsGroupsFilterByPrefix(
          cloudwatchlogs,
          logGroupNamePrefix,
          nextToken,
          allLogGroupNames
        );
      } else {
        return allLogGroupNames;
      }
    })
    .catch(err => console.error(err) || err);
};

export const getLogGroupSubscriptionFilters = (
  cloudwatchlogs,
  logGroupName,
  paginationToken,
  allSubscriptionsTemp = []
) => {
  console.log(`paginationToken ${paginationToken}`);
  console.log(`allSubscriptionsTemp.length ${allSubscriptionsTemp.length}`);
  const params = {
    logGroupName,
    limit: "1",
    nextToken: paginationToken
  };
  return cloudwatchlogs
    .send(new DescribeSubscriptionFiltersCommand(params))
    .then(result => {
      console.debug(
        `Retrieved log group subscription filter details.`,
        result
      );
      const allSubscriptionFilters = allSubscriptionsTemp.concat(
        result.subscriptionFilters.map(item => item.destinationArn)
      );
      const nextToken = result.nextToken;
      if (nextToken) {
        return getLogGroupSubscriptionFilters(
          cloudwatchlogs,
          logGroupName,
          nextToken,
          allSubscriptionFilters
        );
      } else {
        return allSubscriptionFilters;
      }
    });
};

export const findTargetLogGroups = async (
  cloudwatchlogs,
  deliveryStreamArn,
  logGroupName
) => {
  const logSubscriptionFilters = await getLogGroupSubscriptionFilters(
    cloudwatchlogs,
    logGroupName
  );
  console.log(
    `logGroupName [${logGroupName}] has logSubscriptionFilters [${logSubscriptionFilters}]`
  );
  const matchSubs = logSubscriptionFilters.filter(p => {
    return p === deliveryStreamArn;
  });
  console.log(`matchSubs [${matchSubs}]`);
  const shouldSubscribe = matchSubs.length === 0;
  console.log(
    `deliveryStreamArn ${deliveryStreamArn} => shouldSubscribe ${shouldSubscribe}`
  );
  return shouldSubscribe;
};

export const determineLogGroupsSubscriptionFilters = async (
  execDeliveryStreamArn,
  accessDeliveryStreamArn,
  cloudwatchlogs
) => {
  const logGroupsWithExecLogPrefix = await describeLogsGroupsFilterByPrefix(
    cloudwatchlogs,
    "API-Gateway-Execution-Logs_"
  );
  console.debug(
    `logGroupsWithExecLogPrefix ${JSON.stringify(logGroupsWithExecLogPrefix)}`
  );
  const logGroupsWithAccessLogPrefix = await describeLogsGroupsFilterByPrefix(
    cloudwatchlogs,
    "API-Gateway-Access-Logs_"
  );
  console.debug(
    `logGroupsWithAccessLogPrefix ${JSON.stringify(logGroupsWithAccessLogPrefix)}`
  );
  return await filterLogGroupsByDeliveryStream(cloudwatchlogs, [
    {
      logGroups: logGroupsWithExecLogPrefix,
      deliveryStreamArn: execDeliveryStreamArn
    },
    {
      logGroups: logGroupsWithAccessLogPrefix,
      deliveryStreamArn: accessDeliveryStreamArn
    }
  ]);
};

const filterLogGroupsByDeliveryStream = async (
  cloudwatchlogs,
  logGroupsSubscriptionInfo
) => {
  const logGroupsSubscriptionFilters = [];
  for (const { logGroups, deliveryStreamArn } of logGroupsSubscriptionInfo) {
    for (const logGroupName of logGroups) {
      console.log(`Checking [${logGroupName}] for [${deliveryStreamArn}]...`);
      if (
        await findTargetLogGroups(cloudwatchlogs, deliveryStreamArn, logGroupName)
      ) {
        logGroupsSubscriptionFilters.push({
          logGroupName,
          deliveryStreamArn
        });
      }
    }
  }
  return logGroupsSubscriptionFilters;
};

export const subscribeLogGroup = (
  logGroupName,
  destinationArn,
  roleArn,
  cloudwatchlogs
) => {
  const params = {
    destinationArn,
    filterName: "ApiAnalytics",
    filterPattern: "",
    logGroupName,
    distribution: "ByLogStream",
    roleArn
  };
  return cloudwatchlogs
    .send(new PutSubscriptionFilterCommand(params))
    .then(
      result =>
        console.log(
          `Created Subscription filter for logGroupName [${logGroupName}]`
        ) || result
    )
    .catch(err =>
      console.error(
        `Error occurred when creatingSubscription filter for [${logGroupName}] -> ${err}`
      )
    );
};
