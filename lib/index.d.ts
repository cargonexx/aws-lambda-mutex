import { DynamoDB } from 'aws-sdk';
import { Context, Handler, Callback } from 'aws-lambda';
export interface Config {
    dynamodbRegion?: string;
    dynamodbTable: string;
    dynamodbPartitionKey: string;
    dynamodbTtlKey: string;
    cleanupAfterSeconds?: number;
    silent?: boolean;
    getKeyFn?: (event: any, context: Context) => string;
}
declare type AsyncHandler<TEvent = any, TResult = any> = (event: TEvent, context: Context) => Promise<TResult | void>;
export declare class MutexLockClient {
    dynamodbRegion: string;
    dynamodbTable: string;
    dynamodbPartitionKey: string;
    dynamodbTtlKey: string;
    cleanupAfterSeconds: number;
    silent: boolean;
    dynamodb: DynamoDB.DocumentClient;
    getKeyFn: (event: any, context: Context) => string;
    constructor(config: Config);
    isFree<TEvent>(event: TEvent, context: Context): Promise<boolean>;
    getKey<TEvent>(event: TEvent, context: Context): string;
    wrapHandler<TEvent = any, TResult = any>(handler: Handler<TEvent, TResult> | AsyncHandler<TEvent, TResult>): (event: TEvent, context: Context, callback: Callback<string | void | TResult>) => void;
    private wrapCallback;
    private wrapAsync;
}
export {};
