Docker Deployment Guide for Proper Noun QA Tool


## 1. Local Development & Multi-arch Build
Our production server runs linux/amd64, while local development is on Apple Silicon (ARM). Build a compatible image and push it to Docker Hub in one step:

# From inside the repo root
# Tag format: <DockerHub-username>/proper-qa:latest

   docker buildx build \
     --platform linux/amd64 \
     --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZW5hYmxpbmctY2ljYWRhLTc5LmNsZXJrLmFjY291bnRzLmRldiQ \
     -t stewartalsop/proper-qa:latest \
     --push .


What this does:
Cross-compiles the image for linux/amd64.
Injects the public build-time env var NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (required by Next.js during npm run build).
Tags the result stewartalsop/proper-qa:latest.
Pushes the image directly to Docker Hub.
> 📝 The remaining runtime environment variables are passed later via --env-file.

## 3. Server Setup
Assumptions:
• Ubuntu 22/24 server (linux/amd64) with Docker & Docker Compose installed.
• User newuser (adjust as needed).
• We will bind the container's port 3000 to host port 3004 (leaving other ports free for other apps).

docker pull stewartalsop/proper-qa:latest

3.2 Prepare runtime env
Create qa.env on the server (same directory where you run Docker):

# qa.env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
OPENROUTER_API_KEY=your_openrouter_api_key

3.3 Run / update container

# Stop & remove any existing container
docker stop proper-qa-container || true
docker rm proper-qa-container || true

# Ensure port 3004 is free
sudo lsof -i :3004 || true

# Launch new container
docker run -d --name proper-qa-container \
  -p 3004:3000 \
  --env-file qa.env \
  --restart unless-stopped \
  stewartalsop/proper-qa:latest

# Follow logs
docker logs -f proper-qa-container