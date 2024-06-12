# create var with the absolute current path
current_dir=$(dirname "$(realpath "$0")")


yarn hasura metadata apply --admin-secret "$HASURA_GRAPHQL_ADMIN_SECRET" --endpoint "$HASURA_ENDPOINT" --log-level DEBUG --project projects/hasura