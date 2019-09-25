"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = require("aws-sdk");
const util_1 = require("util");
function isAsyncHandler(handler) {
    return util_1.types.isAsyncFunction(handler) || util_1.types.isPromise(handler);
}
class MutexLockClient {
    constructor(config) {
        this.dynamodbRegion = config.dynamodbRegion || "us-east-1";
        this.dynamodbTable = config.dynamodbTable;
        this.dynamodbPartitionKey = config.dynamodbPartitionKey || "id";
        this.dynamodbTtlKey = config.dynamodbTtlKey || "ttl";
        this.cleanupAfterSeconds = config.cleanupAfterSeconds || 1200;
        this.silent = config.silent === undefined ? true : config.silent;
        this.dynamodb = new aws_sdk_1.DynamoDB.DocumentClient({ region: this.dynamodbRegion });
    }
    async isFree(context) {
        const params = {
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
        }
        catch (e) {
            if (e.code === "ConditionalCheckFailedException") {
                return false;
            }
            console.log(JSON.stringify(e));
            throw e;
        }
    }
    getKey(context) {
        return [context.functionName, context.functionVersion, context.awsRequestId].join('-');
    }
    wrapHandler(handler) {
        if (isAsyncHandler(handler)) {
            return this.wrapAsync(handler);
        }
        else {
            return this.wrapCallback(handler);
        }
    }
    wrapCallback(handler) {
        const self = this;
        return (event, context, callback) => {
            self.isFree(context)
                .then(isFree => {
                if (isFree) {
                    handler(event, context, callback);
                }
                else {
                    if (!self.silent) {
                        console.log('execution suppressed, this request seems to be invoked at least once already');
                        console.log(event, context);
                        callback(null, 'invocation skipped');
                    }
                }
            })
                .catch(err => {
                callback(err);
            });
        };
    }
    wrapAsync(handler) {
        const self = this;
        return async (event, context) => {
            const neverRan = await self.isFree(context);
            if (neverRan) {
                return handler(event, context);
            }
            if (!self.silent) {
                console.log('execution suppressed, this request seems to be invoked at least once already');
                console.log(event, context);
                return 'invocation skipped';
            }
        };
    }
}
exports.MutexLockClient = MutexLockClient;
//# sourceMappingURL=index.js.map