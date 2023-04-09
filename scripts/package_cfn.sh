#!/bin/bash

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

# Use the AWS CLI to perform a cloudformation package
aws cloudformation package \
  --template-file "build/cloudformation.json" \
  --s3-bucket "$CLOUDFORMATION_S3_BUCKET" \
  --output-template-file "build/cloudformation.yaml"