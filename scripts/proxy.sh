echo "Port-forwarding into the cluster..."
export PG_POD=$(kubectl get pods -n $NAMESPACE -l app=postgres -o custom-columns=:metadata.name --no-headers) # Get the name of the postgres pod
echo "Postgres pod: $PG_POD" 
kubectl port-forward pod/$PG_POD 5432:5432 -n $NAMESPACE