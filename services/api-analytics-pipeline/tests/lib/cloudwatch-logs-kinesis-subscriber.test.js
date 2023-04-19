import chai from "chai";
import sinonChai from "sinon-chai";
import deepEqualInAnyOrder from "deep-equal-in-any-order";

const { expect } = chai;
chai.use(sinonChai);
chai.use(deepEqualInAnyOrder);

import {
  determineLogGroupsSubscriptionFilters,
  describeLogsGroupsFilterByPrefix,
  getLogGroupSubscriptionFilters,
  getSsmParameter,
  findTargetLogGroups
} from "../../src/lib/cloudwatch-logs-kinesis-subscriber";

const ssmResult = {
  Parameter: {
    Name: "/product/analytics/cloudwatch-kinesis-role-arn",
    Type: "String",
    Value:
      "arn:aws:iam::123456789012:role/api-data-analytics-CloudWatchLogsToKinesisFirehose-8XMT51B47VQGC",
    Version: 1,
    LastModifiedDate: "2023-04-09T12:34:56.789Z",
    ARN:
      "arn:aws:ssm:us-east-1:123456789012:parameter/product/analytics/cloudwatch-kinesis-role-arn",
    DataType: "text"
  }
};

const ssm = {
  send: () => Promise.resolve(ssmResult)
};

const executionLogsDescribeLogGroupsResult = {
  logGroups: [
    {
      logGroupName: "API-Gateway-Execution-Logs_kyc8nws4p1/main",
      creationTime: 1628711905367,
      metricFilterCount: 0,
      arn:
        "arn:aws:logs:us-east-1:123456789012:log-group:API-Gateway-Execution-Logs_kyc8nws4p1/main:*",
      storedBytes: 931002
    },
    {
      logGroupName: "API-Gateway-Execution-Logs_yb628s4k9t/main",
      creationTime: 1638715886962,
      metricFilterCount: 0,
      arn:
        "arn:aws:logs:us-east-1:123456789012:log-group:API-Gateway-Execution-Logs_yb628s4k9t/main:*",
      storedBytes: 146300533
    }
  ]
};

const accessLogsDescribeLogGroupsResult = {
  logGroups: [
    {
      logGroupName: "API-Gateway-Access-Logs_payments-service_m37hy4se8q",
      creationTime: 1628711905367,
      metricFilterCount: 0,
      arn:
        "arn:aws:logs:us-east-1:123456789012:log-group:API-Gateway-Access-Logs_payments-service_m37hy4se8q:*",
      storedBytes: 931002
    },
    {
      logGroupName:
        "API-Gateway-Access-Logs_booking-service-service_yb628s4k9t",
      creationTime: 1638715886962,
      metricFilterCount: 0,
      arn:
        "arn:aws:logs:us-east-1:123456789012:log-group:API-Gateway-Access-Logs_booking-service-service_yb628s4k9t:*",
      storedBytes: 146300533
    }
  ]
};

const kyc8nws4p1DescribeSubscriptionFilters = {
  subscriptionFilters: [
    {
      filterName: "ApiAnalytics",
      logGroupName: "API-Gateway-Execution-Logs_kyc8nws4p1/main",
      filterPattern: "",
      destinationArn:
        "arn:aws:firehose:us-east-1:123456789012:deliverystream/api-data-analytics-KinesisDataFirehoseStreamDeliver-XgqLWkPfAiZr",
      roleArn:
        "arn:aws:iam::123456789012:role/api-data-analytics-CloudWatchLogsToKinesisFirehose-8XMT51B47VQGC",
      distribution: "ByLogStream",
      creationTime: 1629342192438
    }
  ]
};
const yb628s4k9tDescribeSubscriptionFilters = {
  subscriptionFilters: [
    {
      filterName: "ApiAnalytics",
      logGroupName: "API-Gateway-Execution-Logs_yb628s4k9t/main",
      filterPattern: "",
      destinationArn:
        "arn:aws:firehose:us-east-1:123456789012:deliverystream/api-data-analytics-KinesisDataFirehoseStreamDeliver-XgqLWkPfAiZr",
      roleArn:
        "arn:aws:iam::123456789012:role/api-data-analytics-CloudWatchLogsToKinesisFirehose-8XMT51B47VQGC",
      distribution: "ByLogStream",
      creationTime: 1629342192438
    }
  ]
};
const m37hy4se8qDescribeSubscriptionFilters = {
  subscriptionFilters: [
    {
      filterName: "ApiAnalytics",
      logGroupName: "API-Gateway-Access-Logs_payments-service_m37hy4se8q",
      filterPattern: "",
      destinationArn:
        "arn:aws:firehose:us-east-1:123456789012:deliverystream/api-data-analytics-KinesisDataFirehoseStreamDeliver-XgqLWkPfAiZr",
      roleArn:
        "arn:aws:iam::123456789012:role/api-data-analytics-CloudWatchLogsToKinesisFirehose-8XMT51B47VQGC",
      distribution: "ByLogStream",
      creationTime: 1629342192438
    }
  ]
};
const yb628s4k9tAccessLogsDescribeSubscriptionFilters = {
  subscriptionFilters: [
    {
      filterName: "ApiAnalytics",
      logGroupName:
        "API-Gateway-Access-Logs_booking-service-service_yb628s4k9t",
      filterPattern: "",
      destinationArn:
        "arn:aws:firehose:us-east-1:123456789012:deliverystream/api-data-analytics-KinesisDataFirehoseStreamDeliver-XgqLWkPfAiZr",
      roleArn:
        "arn:aws:iam::123456789012:role/api-data-analytics-CloudWatchLogsToKinesisFirehose-8XMT51B47VQGC",
      distribution: "ByLogStream",
      creationTime: 1629342192438
    }
  ]
};

const cloudwatch = {
  send: function(command) {
    if (command.input && command.input.logGroupNamePrefix) {
      return this.describeLogGroups(command.input);
    } else if (command.input && command.input.logGroupName) {
      return this.describeSubscriptionFilters(command.input);
    }
  },

  describeLogGroups: function({ logGroupNamePrefix }) {
    if (logGroupNamePrefix === "API-Gateway-Execution-Logs_") {
      return Promise.resolve(executionLogsDescribeLogGroupsResult);
    } else if (logGroupNamePrefix === "API-Gateway-Access-Logs_") {
      return Promise.resolve(accessLogsDescribeLogGroupsResult);
    }
  },

  describeSubscriptionFilters: function({ logGroupName }) {
    console.log(`describeSubscriptionFilters mock ${logGroupName}`);
    if (logGroupName === "API-Gateway-Execution-Logs_kyc8nws4p1/main") {
      return Promise.resolve(kyc8nws4p1DescribeSubscriptionFilters);
    } else if (logGroupName === "API-Gateway-Execution-Logs_yb628s4k9t/main") {
      return Promise.resolve(yb628s4k9tDescribeSubscriptionFilters);
    } else if (
      logGroupName === "API-Gateway-Access-Logs_payments-service_m37hy4se8q"
    ) {
      return Promise.resolve(m37hy4se8qDescribeSubscriptionFilters);
    } else if (
      logGroupName ===
      "API-Gateway-Access-Logs_booking-service-service_yb628s4k9t"
    ) {
      return Promise.resolve(yb628s4k9tAccessLogsDescribeSubscriptionFilters);
    }
  }
};

describe("Rest API Execution log subscriber", function() {
  it("getSsmParameter should map correctly", function() {
    const mockRet =
      "arn:aws:iam::123456789012:role/api-data-analytics-CloudWatchLogsToKinesisFirehose-8XMT51B47VQGC";
    return getSsmParameter(
      "/product/analytics/cloudwatch-kinesis-role-arn",
      ssm
    ).then(
      result => console.log(result) || expect(result).to.equal(mockRet)
    );
  });
  it("describeLogsGroupsFilterByPrefix should map correctly", function() {
    const mockRet = [
      "API-Gateway-Execution-Logs_kyc8nws4p1/main",
      "API-Gateway-Execution-Logs_yb628s4k9t/main"
    ];
    return describeLogsGroupsFilterByPrefix(cloudwatch, "API-Gateway-Execution-Logs_").then(
      result => console.log(result) || expect(result).to.eql(mockRet)
    );
  });
  it("getLogGroupSubscriptionFilters should map correctly", function() {
    const mockRet = [
      "arn:aws:firehose:us-east-1:123456789012:deliverystream/api-data-analytics-KinesisDataFirehoseStreamDeliver-XgqLWkPfAiZr"
    ];
    const logGroupName = "API-Gateway-Access-Logs_payments-service_m37hy4se8q";
    return getLogGroupSubscriptionFilters(cloudwatch, logGroupName).then(
      result => console.log(result) || expect(result).to.eql(mockRet)
    );
  });
  it("findTargetLogGroups should correctly identify log groups that are not already subscribed", function() {
    const mockRet = true;
    return findTargetLogGroups(
      cloudwatch,
      "deliveryStreamArn",
      "API-Gateway-Access-Logs_payments-service_m37hy4se8q"
    ).then(
      result => console.log(result) || expect(result).to.eql(mockRet)
    );
  });
  it("determineLogGroupsSubscriptionFilters should correctly identify log groups that are not already subscribed", function() {
    const mockRet = [
      {
        deliveryStreamArn: "accessLogsDeliveryStreamArn",
        logGroupName: "API-Gateway-Access-Logs_payments-service_m37hy4se8q"
      },
      {
        deliveryStreamArn: "accessLogsDeliveryStreamArn",
        logGroupName:
          "API-Gateway-Access-Logs_booking-service-service_yb628s4k9t"
      },
      {
        deliveryStreamArn: "execLogsDeliveryStreamArn",
        logGroupName: "API-Gateway-Execution-Logs_yb628s4k9t/main"
      },
      {
        deliveryStreamArn: "execLogsDeliveryStreamArn",
        logGroupName: "API-Gateway-Execution-Logs_kyc8nws4p1/main"
      }
    ];
    return determineLogGroupsSubscriptionFilters(
      "execLogsDeliveryStreamArn",
      "accessLogsDeliveryStreamArn",
      cloudwatch
    ).then(
      result =>
        console.log(result) ||
        expect(result).to.deep.equalInAnyOrder(mockRet)
    );
  });
});
