# aws-lambda-mutex
This assures an idempotent execution of lambda functions which have side-effects and are sensitive to being invokes multiple times (which happens and cannot be avoided, see [1](https://forums.aws.amazon.com/thread.jspa?threadID=241313) and [2](https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html))

## dynamodb table
the cloudformation resource for the backing dynamodb table:

```
    MutexLockTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: DYNAMODB_LOCK_TABLE
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
        TimeToLiveSpecification:
          AttributeName: ttl
          Enabled: true
```
the attributeNames used here (`id` and `ttl`) have to match the settings in the config of `MutexLockClient`
make sure the tableNames match as well.

## example usage
```
const { MutexLockClient } = require('@cargonexx/aws-lambda-mutex');

const lockClient = new MutexLockClient({
  dynamodbRegion: "eu-west-1",
  dynamodbTable: process.env.DYNAMODB_LOCK_TABLE,
  dynamodbPartitionKey: "id",
  dynamodbTtlKey: "ttl",
  cleanupAfterSeconds: 60,
  silent: false
});


module.exports.myHandler = lockClient.wrapHandler(async (event, context) => {
  console.log(JSON.stringify(context, null, 2));
  return 'implement me';
});
```