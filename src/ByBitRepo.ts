import { AWSError } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { APIMode, IPlaceOrderResponse, IPosition, Side } from './bybit';

export interface IByBitPositionEntriesDocument extends IPlaceOrderResponse {
  type_id: string;
  timestamp: number;
}

const TABLE_NAME = 'bybit-orders';

class ByBitRepo {
  constructor(private docClient: DocumentClient) {}

  public async getLastDocument(): Promise<
    IByBitPositionEntriesDocument | undefined
  > {
    const result = await this.docClient
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'type_id = :id',
        ExpressionAttributeValues: {
          ':id': 'entry',
        },
        ScanIndexForward: false,
      })
      .promise();

    return result.Items[0] as IByBitPositionEntriesDocument;
  }

  public async addDocument(
    data: IByBitPositionEntriesDocument
  ): Promise<PromiseResult<DocumentClient.PutItemOutput, AWSError>> {
    return this.docClient.put({ TableName: TABLE_NAME, Item: data }).promise();
  }

  public toDbModel(data: any): IByBitPositionEntriesDocument {
    return {
      ...data,
      type_id: 'entry',
      timestamp: new Date().getTime(),
    };
  }
}

export default ByBitRepo;
