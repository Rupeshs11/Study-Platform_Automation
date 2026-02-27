# Kubernetes Manifests for Study Platform

This directory contains Kubernetes manifest files for deploying the Study Platform application.

## Directory Structure

```
k8s/
├── namespace.yaml          # Namespace definition
├── configmap.yaml          # Non-sensitive configuration
├── secrets.yaml            # Sensitive configuration (credentials, API keys)
├── mongodb-statefulset.yaml # MongoDB StatefulSet with PVC
├── redis-deployment.yaml   # Redis Deployment with PVC
├── backend-deployment.yaml # Backend Deployment and Service
├── frontend-deployment.yaml # Frontend Deployment and Service
├── ingress.yaml            # Ingress for external access
├── hpa.yaml                # Horizontal Pod Autoscaler
├── network-policy.yaml     # Network policies for security
└── README.md               # This file
```

## Prerequisites

1. A running Kubernetes cluster (minikube, kind, EKS, GKE, AKS, etc.)
2. `kubectl` configured to connect to your cluster
3. Docker images built and pushed to a container registry

## Building Docker Images

Before deploying, build and push the Docker images:

```bash
# Build backend image
cd backend
docker build -t <your-registry>/study-platform-backend:latest .
docker push <your-registry>/study-platform-backend:latest

# Build frontend image
cd ../frontend
docker build -t <your-registry>/study-platform-frontend:latest .
docker push <your-registry>/study-platform-frontend:latest
```

**Note:** Update the image names in `backend-deployment.yaml` and `frontend-deployment.yaml` to match your registry.

## Deployment Steps

### 1. Create Namespace

```bash
kubectl apply -f namespace.yaml
```

### 2. Update Secrets

Before deploying, update the `secrets.yaml` file with your actual secrets:

```bash
# Generate base64 encoded values
echo -n 'your-mongo-password' | base64
echo -n 'your-jwt-secret' | base64
echo -n 'your-nvidia-api-key' | base64
```

Then update the corresponding values in `secrets.yaml`.

### 3. Deploy All Resources

Deploy in the following order:

```bash
# Apply ConfigMap and Secrets
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# Deploy databases
kubectl apply -f mongodb-statefulset.yaml
kubectl apply -f redis-deployment.yaml

# Wait for databases to be ready
kubectl wait --namespace study-platform \
  --for=condition=ready pod \
  --selector=app=mongodb \
  --timeout=120s

kubectl wait --namespace study-platform \
  --for=condition=ready pod \
  --selector=app=redis \
  --timeout=60s

# Deploy application
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

# Deploy Ingress (optional)
kubectl apply -f ingress.yaml

# Deploy HPA (optional)
kubectl apply -f hpa.yaml

# Deploy Network Policies (optional, for enhanced security)
kubectl apply -f network-policy.yaml
```

### One-liner Deployment

```bash
kubectl apply -f namespace.yaml && \
kubectl apply -f configmap.yaml -f secrets.yaml && \
kubectl apply -f mongodb-statefulset.yaml -f redis-deployment.yaml && \
sleep 30 && \
kubectl apply -f backend-deployment.yaml -f frontend-deployment.yaml && \
kubectl apply -f ingress.yaml -f hpa.yaml
```

## Verification

Check deployment status:

```bash
# View all resources in namespace
kubectl get all -n study-platform

# Check pod status
kubectl get pods -n study-platform -w

# View logs
kubectl logs -n study-platform -l app=backend -f
kubectl logs -n study-platform -l app=frontend -f

# Check services
kubectl get svc -n study-platform

# Check ingress
kubectl get ingress -n study-platform
```

## Accessing the Application

### Option 1: Port Forwarding (Development)

```bash
# Forward frontend
kubectl port-forward -n study-platform svc/frontend-service 8080:80

# Access at http://localhost:8080
```

### Option 2: LoadBalancer (Cloud)

If using a cloud provider, the LoadBalancer service will provision an external IP:

```bash
kubectl get svc study-platform-loadbalancer -n study-platform
```

### Option 3: Ingress (Production)

Update your DNS to point to the Ingress controller's external IP and access via the configured hostname.

## Scaling

Manual scaling:

```bash
kubectl scale deployment backend -n study-platform --replicas=3
kubectl scale deployment frontend -n study-platform --replicas=3
```

The HPA will automatically scale based on CPU/memory utilization.

## Cleanup

Remove all resources:

```bash
kubectl delete namespace study-platform
```

## Configuration

### Environment Variables

| Variable | Description | Location |
|----------|-------------|----------|
| `SERVER_PORT` | Backend server port | ConfigMap |
| `MONGODB_URI` | MongoDB connection string | Secret |
| `JWT_SECRET` | JWT signing secret | Secret |
| `JWT_EXPIRATION` | JWT token expiration (ms) | ConfigMap |
| `NVIDIA_API_KEY` | NVIDIA AI API key | Secret |
| `NVIDIA_BASE_URL` | NVIDIA API base URL | ConfigMap |
| `NVIDIA_MODEL` | AI model to use | ConfigMap |

### Resource Limits

Default resource limits are set conservatively. Adjust based on your workload:

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| MongoDB | 250m | 500m | 256Mi | 512Mi |
| Redis | 100m | 250m | 64Mi | 128Mi |
| Backend | 250m | 500m | 512Mi | 1Gi |
| Frontend | 50m | 100m | 64Mi | 128Mi |

## Troubleshooting

### Pods not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n study-platform

# Check logs
kubectl logs <pod-name> -n study-platform --previous
```

### Database connection issues

```bash
# Test MongoDB connectivity
kubectl run mongo-test --rm -it --image=mongo:7.0 -n study-platform -- \
  mongosh mongodb://admin:password@mongodb-service:27017/studyplatform?authSource=admin
```

### Backend health check failing

The backend expects a `/api/health` endpoint. Ensure your application exposes this endpoint or update the probe paths in `backend-deployment.yaml`.
