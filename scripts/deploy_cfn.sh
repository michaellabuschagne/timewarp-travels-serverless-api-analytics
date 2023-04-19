#! /bin/bash

set -euo pipefail

# Load shared functions
# shellcheck source=/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/shared_func.sh"

# Load environment variables from the parent directory
load_env_from_parent_dir

# Check for required environment variables
check_env_var CLOUDFORMATION_S3_BUCKET

# Check if debug mode is enabled
if [ "${DEBUG:-false}" = "true" ]; then
  set -x
fi

# Read parameter-overrides from script arguments, if any
PARAMETER_OVERRIDES=""
if [ $# -gt 0 ]; then
  while [[ $# -gt 0 ]]; do
      key="$1"
      value="${!2}"
      PARAMETER_OVERRIDES+=" $key=$value"
      shift 2
  done
  PARAMETER_OVERRIDES="--parameter-overrides $PARAMETER_OVERRIDES"
fi

aws cloudformation deploy --template-file build/cloudformation.yaml \
--capabilities CAPABILITY_IAM --s3-bucket "$CLOUDFORMATION_S3_BUCKET" \
${PARAMETER_OVERRIDES:+$PARAMETER_OVERRIDES} \
--region "${AWS_REGION:=us-east-1}" --stack "${STACK_NAME}"
