#!/bin/bash

# Set vite env vars
export VITE_SERVER_ENDPOINT=https://$NAMESPACE.server.$DOMAIN
export VITE_HASURA_GQL_ENDPOINT=https://$NAMESPACE.hasura.$DOMAIN/v1/graphql


# Check if the TAG environment variable is set
if [ -z "$TAG" ]; then
  echo "TAG environment variable is not set."
  exit 1
fi

yarn vite build

# Define the name of the Docker image
SERVICE_NAME="client"
IMAGE_NAME="$DOCKER_ORG/$PROJECT_NAME-$SERVICE_NAME"
FULL_IMAGE_NAME="$IMAGE_NAME:$NAMESPACE-$TAG"
FULL_STORYBOOK_IMAGE_NAME="$IMAGE_NAME-storybook:$NAMESPACE-$TAG"


# Build the Docker image with the tag from the TAG environment variable
docker build -t $FULL_IMAGE_NAME .

# Verify the image was built
if [ $? -eq 0 ]; then
  echo "Docker image $FULL_IMAGE_NAME built successfully."
else
  echo "Failed to build Docker image."
  exit 1
fi

docker build -t $FULL_STORYBOOK_IMAGE_NAME -f Dockerfile.storybook .
# Verify the image was built
if [ $? -eq 0 ]; then
  echo "Docker image $FULL_STORYBOOK_IMAGE_NAME built successfully."
else
  echo "Failed to build Docker image."
  exit 1
fi

echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

echo "Pushing image $FULL_IMAGE_NAME to Docker Hub..."
docker push $FULL_IMAGE_NAME

echo "Pushing image $FULL_STORYBOOK_IMAGE_NAME to Docker Hub..."
docker push $FULL_STORYBOOK_IMAGE_NAME
