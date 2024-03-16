
if [ "$USING_DOCKER_COMPOSE" != "true" ]; then
	echo "Port-forwarding into the cluster..."
	PG_POD=$(kubectl get pods -n $NAMESPACE -l app=postgres -o custom-columns=:metadata.name --no-headers) # Get the name of the postgres pod
	echo "Postgres pod: $PG_POD" 

	TEMP_FILE=$(mktemp)
	echo "Temp file: $TEMP_FILE"
	cat $TEMP_FILE
	echo "End of temp file"

	kubectl port-forward pod/$PG_POD 0:5432 -n $NAMESPACE > $TEMP_FILE 2>&1 &

	PID=$! # Save the process ID to kill the port-forwarding later
	echo "Sleeping for 5 seconds..."
	sleep 5 # Wait for the port-forwarding to start
	echo "Temp file contents:"
	cat $TEMP_FILE
	echo "End of temp file contents"

	LOCAL_PG_PORT=$(grep -o '127.0.0.1:[0-9]*' $TEMP_FILE | tail -n 1 | awk -F ':' '{print $2}')

	trap "kill $PID" EXIT # Kill the port-forwarding when the script exits

	echo "Port forwarding setup on local port: $LOCAL_PG_PORT"
	rm $TEMP_FILE

	export PG_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:$LOCAL_PG_PORT/${POSTGRES_DB}"
	echo "PG_URL: $PG_URL"
else
	echo "Using Docker Compose. Skipping port-forwarding..."
fi



echo "Running migrations and seeding data..."
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd ../.. && pwd )"
echo $ROOT_DIR

# Run DB migrations and seed data
cd $ROOT_DIR/services/db
yarn prisma migrate deploy
yarn ts-node seed/seed-db.ts

# Run Hasura metadata apply
cd $ROOT_DIR/services/client
source ./scripts/apply.sh
