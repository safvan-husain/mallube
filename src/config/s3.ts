import AWS from "aws-sdk";
import { config } from "./vars";

// Connect to S3
export const s3 = new AWS.S3({
  endpoint: config.s3BaseUrl,
  accessKeyId: config.s3AccessKey,
  secretAccessKey: config.s3SecretsKey,
  s3BucketEndpoint: true,
});
