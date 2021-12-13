import { AWSError } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { APIMode, IPlaceOrderResponse, IPosition, Side } from './bybit';

export interface IByBitDocument {
  type_id: string;
  timestamp: number;
}

export interface IByBitPositionEntriesDocument
  extends IByBitDocument,
    IPlaceOrderResponse {}

export interface IByBitConfigDocument extends IByBitDocument {
  max_hold_positions: number;
  short_profit: number;
  long_next_entry: number;
  min_qty: number;
  long_profit: number;
  short_next_entry: number;
}

export interface IByBitTriggerDocument extends IByBitDocument {
  short_trigger: boolean;
  long_trigger: boolean;
  short_stoploss: boolean;
  long_stoploss: boolean;
}

export type DynamicObject = Record<string, any>;
export type Key = Record<string, string | number>;
export type AttributeNames = Record<string, string>;

interface UpdateDocumentParams {
  TableName: string;
  Key: Key;
  UpdateExpression: string;
  ExpressionAttributeNames: AttributeNames;
  ExpressionAttributeValues: DynamicObject;
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

  public async getPositionStatus(): Promise<IByBitTriggerDocument> {
    const result = await this.docClient
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'type_id = :id',
        ExpressionAttributeValues: {
          ':id': 'trigger',
        },
      })
      .promise();

    return result.Items[0] as IByBitTriggerDocument;
  }

  public async getConfig(): Promise<IByBitConfigDocument> {
    const result = await this.docClient
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'type_id = :id',
        ExpressionAttributeValues: {
          ':id': 'config',
        },
      })
      .promise();

    return result.Items[0] as IByBitConfigDocument;
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

  public async updateDocument(
    key: Record<string, string | number>,
    data: Record<string, any>
  ): Promise<PromiseResult<DocumentClient.UpdateItemOutput, AWSError>> {
    return this.docClient
      .update(this.toUpdateDocumentParams(key, data))
      .promise();
  }

  private toUpdateDocumentParams(
    key: Key,
    data: DynamicObject
  ): UpdateDocumentParams {
    let updateExpression = 'set';
    const expressionAttributeNames: AttributeNames = {};
    const expressionAttributeValues: DynamicObject = {};

    for (const property in data) {
      updateExpression += ` #${property} = :${property},`;
      expressionAttributeNames[`#${property}`] = property;
      expressionAttributeValues[`:${property}`] = data[property];
    }

    updateExpression = updateExpression.slice(0, -1);

    return {
      TableName: TABLE_NAME,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };
  }
}

export default ByBitRepo;
