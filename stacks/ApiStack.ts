import { Api, Bucket, StackContext, Topic, use } from "sst/constructs";
import { CacheHeaderBehavior, CachePolicy } from "aws-cdk-lib/aws-cloudfront";
import { Duration } from "aws-cdk-lib/core";
import { DBStack } from "./DBStack"
import * as iam from "aws-cdk-lib/aws-iam";


export function ApiStack({ stack }: StackContext) {
  const topic = new Topic(stack, "Report");
  const userTopic = new Topic(stack, "UserTopic");

  const { users_table, exams_table } = use(DBStack);

  const bucket = new Bucket(stack, "Audio");

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      authorizer: "iam",
    },
    routes: {
      "GET /examForm/{id}": {
        function: {
          handler: "packages/functions/src/getExam.getExamData",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table],
          environment: {
            TABLE_NAME: exams_table.tableName,
          },
        },
      },

      "GET /getExamHistory": {
        function: {
          handler: "packages/functions/src/getExamHistory.getExams",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table],
          environment: {
            TABLE_NAME: exams_table.tableName,
          },
        },
      },

      "GET /getExamCount": {
        function: {
          handler: "packages/functions/src/getExamsCount.getExamsCount",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table], // Ensure necessary permissions
          environment: {
            TABLE_NAME: exams_table.tableName, // Pass the table name to the Lambda
          },
        },
      },

      "GET /getBuildingExams": {
        function: {
          handler: "packages/functions/src/getBuildingExams.getExams",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table],
          environment: {
            TABLE_NAME: exams_table.tableName,
          },
        },
      },

      "GET /getPendingExams": {
        function: {
          handler: "packages/functions/src/getPendingExams.getExams",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table],
          environment: {
            TABLE_NAME: exams_table.tableName,
          },
        },
      },

      "POST /generate": {
        function: {
          handler: "packages/functions/src/generateExam.generate",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["bedrock", "dynamodb", exams_table],
          environment: {
            TABLE_NAME: exams_table.tableName,
          },
        },
      },

      "POST /createNewExam": {
        function: {
          handler: "packages/functions/src/createNewExam.createExam",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table, "bedrock"],
          environment: {
            TABLE_NAME: exams_table.tableName,
          },
        },
      },

      "POST /sendForApproval": {
        function: {
          handler: "packages/functions/src/sendExamForApproval.sendForApproval",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table,"sns"],
          environment: {
            TABLE_NAME: exams_table.tableName,
            TOPIC_ARN: userTopic.topicArn,
          },
        },
      },

      "POST /changeExamToBuild": {
        function: {
          handler:
            "packages/functions/src/changeExamStateToBuild.changeToBuild",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table],
          environment: {
            TABLE_NAME: exams_table.tableName,
          },
        },
      },

      "POST /approveExam": {
        function: {
          handler: "packages/functions/src/approveExam.approve",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table,"polly","s3","bedrock","sns"],
          environment: {
            TABLE_NAME: exams_table.tableName,
            BUCKET_NAME: bucket.bucketName,
            TOPIC_ARN: userTopic.topicArn,
          },
        },
      },

      "POST /disapproveExam": {
        function: {
          handler: "packages/functions/src/disapproveExam.disapprove",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", exams_table,"sns"],
          environment: {
            TABLE_NAME: exams_table.tableName,
            TOPIC_ARN: userTopic.topicArn,
          },
        },
      },

      "POST /feedback": {
        function: {
          handler: "packages/functions/src/feedback.handler",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          environment: {
            TOPIC_ARN: topic.topicArn, // Add the ARN to the environment
          },
          permissions: ["sns"],
        },
      },

      "POST /checkUserRole": {
        function: {
          handler: "packages/functions/src/checkUser.handler",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["dynamodb", users_table],
          environment: {
            TABLE_NAME: users_table.tableName,
          },
        },
      },
      "POST /convertToAudio": {
        function: {
          handler: "packages/functions/src/generateAudio.handler",
          runtime: "nodejs20.x",
          timeout: "180 seconds",
          permissions: ["polly"],
        },
      },
    },
  });

  // cache policy to use with cloudfront as reverse proxy to avoid cors
  // https://dev.to/larswww/real-world-serverless-part-3-cloudfront-reverse-proxy-no-cors-cgj
  const apiCachePolicy = new CachePolicy(stack, "CachePolicy", {
    minTtl: Duration.seconds(0), // no cache by default unless backend decides otherwise
    defaultTtl: Duration.seconds(0),
    headerBehavior: CacheHeaderBehavior.allowList(
      "Accept",
      "Authorization",
      "Content-Type",
      "Referer"
    ),
  });

  return { api, apiCachePolicy };
}
