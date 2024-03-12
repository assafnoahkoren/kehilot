
zeus $VITE_HASURA_GQL_ENDPOINT ./src/generated --header=x-hasura-admin-secret:$HASURA_GRAPHQL_ADMIN_SECRET

cd ../hasura

hasura metadata export --admin-secret "$HASURA_GRAPHQL_ADMIN_SECRET" --endpoint "$HASURA_ENDPOINT" # --log-level DEBUG
