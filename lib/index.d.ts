import { DynamoDB } from 'aws-sdk';
import { Context, Callback } from 'aws-lambda';
export interface Config {
    dynamodbRegion?: string;
    dynamodbTable: string;
    dynamodbPartitionKey: string;
    dynamodbTtlKey: string;
    cleanupAfterSeconds?: number;
    silent?: boolean;
}
export declare class MutexLockCLient {
    dynamodbRegion: string;
    dynamodbTable: string;
    dynamodbPartitionKey: string;
    dynamodbTtlKey: string;
    cleanupAfterSeconds: number;
    silent: boolean;
    dynamodb: DynamoDB.DocumentClient;
    constructor(config: Config);
    isFree(context: Context): Promise<boolean>;
    getKey(context: Context): string;
    wrapHandler(handler: any): (event: any, context: Context, callback: Callback<any>) => void;
    private wrapCallback;
    private wrapAsync;
}
