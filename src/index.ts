import { DynamoDB } from 'aws-sdk';
import { types } from 'util';
import { Context, Handler, Callback } from 'aws-lambda';

export interface Config {
  dynamodbRegion?: string;
  dynamodbTable: string;
  dynamodbPartitionKey: string;
  dynamodbTtlKey: string;
  cleanupAfterSeconds?: number;
  silent?: boolean;
}

type AsyncHandler<TEvent = any, TResult = any> = (
  event: TEvent,
  context: Context
) =>  Promise<TResult | void>;

function isAsyncHandler(handler: Handler | AsyncHandler): handler is AsyncHandler {
  return types.isAsyncFunction(handler) || types.isPromise(handler);
}

export class MutexLockCLient {
  dynamodbRegion: string;
  dynamodbTable: string;
  dynamodbPartitionKey: string;
  dynamodbTtlKey: string;
  cleanupAfterSeconds: number;
  silent: boolean;
  dynamodb: DynamoDB.DocumentClient;

  constructor(config: Config) {
    this.dynamodbRegion = config.dynamodbRegion || "us-east-1";
    this.dynamodbTable = config.dynamodbTable;
    this.dynamodbPartitionKey = config.dynamodbPartitionKey || "id";
    this.dynamodbTtlKey = config.dynamodbTtlKey || "ttl";
    this.cleanupAfterSeconds = config.cleanupAfterSeconds || 1200;
    this.silent = config.silent === undefined ? true : config.silent;

    this.dynamodb = new DynamoDB.DocumentClient({ region: this.dynamodbRegion });
  }

  public async isFree(context: Context) {
    const params: DynamoDB.DocumentClient.PutItemInput = {
      TableName: this.dynamodbTable,
      Item: {},
      ConditionExpression: "attribute_not_exists(#partitionKey)",
      ExpressionAttributeNames: {
        "#partitionKey": this.dynamodbPartitionKey
      }
    };
    params.Item[this.dynamodbPartitionKey] = this.getKey(context);
    params.Item[this.dynamodbTtlKey] = ((new Date()).valueOf() / 1000) | 0 + this.cleanupAfterSeconds;
    try {
      await this.dynamodb.put(params).promise();
      return true;
    } catch (e) {
      if (e.code === "ConditionalCheckFailedException") {
        return false;
      }
      console.log(JSON.stringify(e));
      throw e;
    }
  }

  getKey(context: Context) {
    return [context.functionName, context.functionVersion, context.awsRequestId].join('-');
  }

  public wrapHandler<TEvent = any, TResult = any>(handler: Handler<TEvent, TResult> | AsyncHandler<TEvent, TResult>) {
    if (isAsyncHandler(handler)) {
      return this.wrapAsync(handler);
    } else {
      return this.wrapCallback(handler);
    }
  }

  private wrapCallback<TEvent, TResult>(handler: Handler<TEvent, TResult>) {
    const self = this;
    return (event: TEvent, context: Context, callback: Callback<TResult | string>) => {
      self.isFree(context)
        .then(isFree => {
          if (isFree) {
            handler(event, context, callback);
          } else {
            if (!self.silent) {
              console.log('execution suppressed, this request seems to be invoked at least once already');
              console.log(event, context);
              callback(null, 'invocation skipped');
            }
          }
        })
        .catch(err => {
          callback(err);
        })
    };
  }


  private wrapAsync<TEvent, TResult>(handler: AsyncHandler<TEvent, TResult>): AsyncHandler<TEvent, TResult | string> {
    const self = this;
    return async (event: TEvent, context: Context): Promise<TResult | string | void> => {
      const neverRan = await self.isFree(context);
      if (neverRan) {
        return handler(event, context);
      }
      if (!self.silent) {
        console.log('execution suppressed, this request seems to be invoked at least once already');
        console.log(event, context);
        return 'invocation skipped';
      }
    }
  }
}