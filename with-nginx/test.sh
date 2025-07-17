export AWS_ACCESS_KEY_ID=$(echo -n $(cat ~/.aws/credentials | grep aws_access_key_id | awk -F= '{ print $2}'))
export AWS_SECRET_ACCESS_KEY=$(echo $(cat ~/.aws/credentials | grep aws_secret_access_key | awk -F= '{ print $2}'))
export AWS_REGION=us-east-1

set -xueo pipefail

time curl -v -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-portkey-provider: bedrock" \
  -H "x-portkey-aws-access-key-id: $AWS_ACCESS_KEY_ID" \
  -H "x-portkey-aws-secret-access-key: $AWS_SECRET_ACCESS_KEY" \
  -H "x-aws-region: $AWS_REGION" \
  --data @pii.json | ~/bin/yq -P
