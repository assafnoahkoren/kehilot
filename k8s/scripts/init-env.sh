echo "Running migrations and seeding data..."
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd ../.. && pwd )"
echo $ROOT_DIR

# Run DB migrations and seed data
cd $ROOT_DIR/projects/db
yarn prisma migrate deploy
yarn ts-node seed/seed-db.ts

# Run Hasura metadata apply
# cd $ROOT_DIR/projects/client
# source ./scripts/apply.sh
