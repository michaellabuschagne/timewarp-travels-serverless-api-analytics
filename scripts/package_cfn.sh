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

# Delete the build directory if it exists, then create a new one
BUILD_DIR="$(pwd)/build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy the contents of the src directory to the build directory
cp -r "$(pwd)/src"/* "$BUILD_DIR"

# Use the AWS CLI to perform a cloudformation package
aws cloudformation package \
  --template-file "$BUILD_DIR/cloudformation.json" \
  --s3-bucket "$CLOUDFORMATION_S3_BUCKET" \
  --output-template-file "$BUILD_DIR/cloudformation.yaml"