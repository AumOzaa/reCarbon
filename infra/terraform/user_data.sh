#!/bin/bash

set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

# ─────────────────────────────────────────────
# 1. System packages
# ─────────────────────────────────────────────

apt-get update
apt-get upgrade -y

apt-get install -y \
  ca-certificates \
  curl \
  gnupg

# ─────────────────────────────────────────────
# 2. Install Docker
# ─────────────────────────────────────────────

install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc

chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update

apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

systemctl enable docker
systemctl start docker

# Allow ubuntu user to use Docker without sudo
usermod -aG docker ubuntu

# Application directory
mkdir -p /opt/recarbon
chown ubuntu:ubuntu /opt/recarbon

# ─────────────────────────────────────────────
# 3. Pull latest ReCarbon image
# ─────────────────────────────────────────────

DOCKER_IMAGE="prathamalwayscomeslast/recarbon-backend:latest"

docker pull "$DOCKER_IMAGE"

# ─────────────────────────────────────────────
# 4. Start backend
# ─────────────────────────────────────────────

docker run -d \
  --name recarbon-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  "$DOCKER_IMAGE"

# ─────────────────────────────────────────────
# 5. Cleanup
# ─────────────────────────────────────────────

docker image prune -af

echo "ReCarbon backend deployed successfully."
docker ps