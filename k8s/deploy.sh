current_dir=$(dirname "$(realpath "$0")")
decoded_kube_config_path="$current_dir/decoded-kube-config.yaml"
echo "decoded_kube_config_path= $decoded_kube_config_path"

echo $KUBE_CONFIG | base64 --decode > "$decoded_kube_config_path"

# Option 1: Set the KUBECONFIG environment variable to use the decoded file
export KUBECONFIG="$decoded_kube_config_path"

source ./k8s/scripts/set-endpoints.sh

replace_env_vars() {

		local filename=$1
		local dirname=$(dirname "$filename")
		local basename=$(basename "$filename")

		# Create the tmp folder if it doesn't exist
		if [ ! -d "$dirname/tmp" ]; then
			mkdir "$dirname/tmp"
		fi

    
    if [ ! -f "$filename" ]; then
        echo "File does not exist: $filename"
        return 1
    fi

    # Create a new filename for the processed file
    # This creates a file with a suffix indicating it's processed, in the same directory
    local new_filename="${dirname}/tmp/${basename}"

    # Use envsubst to replace environment variables and save to a new file
    envsubst < "$filename" > "$new_filename"
    echo "Processed $filename and saved changes to $new_filename"
}

# Loop over all .yaml files in the k8s/ directory
for file in k8s/*.yaml; do
    replace_env_vars "$file"
done



# Now you can use kubectl commands directly
kubectl apply -f k8s/tmp/namespace.yaml
kubectl apply -f k8s/tmp/config-map.yaml
kubectl apply -f k8s/tmp

echo "Restarting deployments... (This step is for existing environments to refresh images and environment variables)"
kubectl -n $NAMESPACE rollout restart deploy





echo "Waiting 30s for services to start..."
for ((i=30; i>=0; i--)); do
	if [ $i -eq 1 ]; then
		echo -ne "1 second left...\r"
	else
		echo -ne "$i seconds left...\r"
	fi
	sleep 1
done
source ./k8s/scripts/init-env.sh

echo  "Services:"
echo "	- hasura: https://$NAMESPACE.hasura.$DOMAIN"
echo "	- client: https://$NAMESPACE.client.$DOMAIN"
echo "	- server: https://$NAMESPACE.server.$DOMAIN"
echo "	- pstgre: can be accessed via proxying to the cluster"


rm "$decoded_kube_config_path"

echo "Cleaning up temporary files..."
find k8s/tmp -type f -name '*.yaml' -exec rm {} +
echo "Cleanup complete."
