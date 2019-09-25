# aws-lambda-mutex
ensure only-once execution of lambda functions

## example usage
```
const { MutexLockCLient } = require('aws-lambda-mutex');

const lockClient = new MutexLockCLient({
  dynamodbRegion: "eu-west-1",
  dynamodbTable: process.env.DYNAMODB_LOCK_TABLE,
  dynamodbPartitionKey: "id",
  dynamodbTtlKey: "ttl",
  cleanupAfterSeconds: 60,
  silent: false
});


module.exports.createBankfile = lockClient.wrapHandler(async (event, context) => {
  console.log(JSON.stringify(context, null, 2));
  return 'implement me';
});
```