#!/bin/bash

# Check if the TAG environment variable is set
if [ -z "$TAG" ]; then
  echo "TAG environment variable is not set."
  exit 1
fi


SERVICE_DIR=$(pwd)
ROOT_DIR=$(pwd)/../../

# Define the name of the Docker image
SERVICE_NAME="server"
IMAGE_NAME="$DOCKER_ORG/$PROJECT_NAME-$SERVICE_NAME"
FULL_IMAGE_NAME="$IMAGE_NAME:$NAMESPACE-$TAG"

# Build the Docker image with the tag from the TAG environment variable
docker build -t $FULL_IMAGE_NAME -f $SERVICE_DIR/Dockerfile $ROOT_DIR

# Verify the image was built
if [ $? -eq 0 ]; then
  echo "Docker image $FULL_IMAGE_NAME built successfully."
else
  echo "Failed to build Docker image."
  exit 1
fi

echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

echo "Pushing image $FULL_IMAGE_NAME to Docker Hub..."
docker push $FULL_IMAGE_NAME