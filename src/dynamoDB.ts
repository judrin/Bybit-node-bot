import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

AWS.config.update({
  region: process.env.AWS_REGION,
});

export const docClient = new AWS.DynamoDB.DocumentClient();
