export AWS_ACCESS_KEY_ID=$(echo -n $(cat ~/.aws/credentials | grep aws_access_key_id | awk -F= '{ print $2}'))
export AWS_SECRET_ACCESS_KEY=$(echo $(cat ~/.aws/credentials | grep aws_secret_access_key | awk -F= '{ print $2}'))
export AWS_REGION=us-east-1

#-H "x-portkey-aws-session-token: IQoJ..." \

time curl -v -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  --data @pii.json  | yq -P 
