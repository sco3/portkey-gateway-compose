#!/bin/bash
# run_compose.sh

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Ensure the nginx directory exists
mkdir -p ./nginx

# Generate the Nginx configuration file from the template
# This happens ON THE HOST MACHINE before Docker Compose starts
envsubst \
  '${AWS_ACCESS_KEY_ID} ${AWS_SECRET_ACCESS_KEY} ${AWS_REGION}' \
  < ./nginx/nginx.conf.template \
  > ./nginx/nginx.conf

# Check if envsubst was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to substitute environment variables into nginx.conf.template"
  exit 1
fi

echo "Generated nginx/nginx.conf:"
cat ./nginx/nginx.conf

# Now run Docker Compose
docker compose up "$@" # "$@" passes any arguments like -d