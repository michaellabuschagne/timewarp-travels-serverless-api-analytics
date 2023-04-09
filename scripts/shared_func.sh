#!/bin/bash

# Load environment variables from .env file if it exists
load_env_from_parent_dir() {
    # Check if the .env file exists in the parent directory
    if [ ! -f "$(pwd)/.env" ]; then
        echo "Error: .env file not found in the parent directory"
        return 1
    fi

    echo "Found $(pwd)/.env, setting exports"
    cat "$(pwd)/.env"
    # Read the .env file from the parent directory and export the variables
    while IFS='=' read -r key value; do
        # Check if the line is a valid key-value pair
        if [[ -n "${key// }" ]] && [[ -n "${value// }" ]] && [[ $key != "#"* ]]; then
            export "$key=$value"
            echo "Exported: $key=$value"
        fi
    done < "$(pwd)/.env"

    echo "Environment variables from .env file in the parent directory have been exported."
}

# Function to check if an environment variable is set
check_env_var() {
  env_var_name="$1"

  if [ -z "${!env_var_name}" ]; then
    echo "Error: $env_var_name environment variable is not set."
    exit 1
  fi
  echo "${env_var_name} is set to ${!env_var_name}"
}