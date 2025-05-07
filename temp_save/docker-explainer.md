# Docker Deployment Guide for Proper Noun QA Tool

This guide explains how to build, push, and deploy the Proper Noun QA Tool using Docker.

## Local Development and Building

### Building for Server Compatibility

Our server runs on linux/amd64 architecture, but local development happens on ARM-based machines (like M1/M2 Macs). To ensure compatibility:

```bash
# Build for linux/amd64 architecture with Clerk publishable key
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here \
  -t stewartalsop/proper-qa:latest --push .
```