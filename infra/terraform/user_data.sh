#!/bin/bash
# shellcheck disable=SC2046
# shellcheck disable=SC1128

set -e

export DEBIAN_FRONTEND=noninteractive

echo "=== Updating system ==="
apt-get update
apt-get upgrade -y

echo "=== Installing required packages ==="
apt-get install -y \
  ca-certificates \
  curl \
  gnupg

echo "=== Installing Docker ==="

install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc

chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update

apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

echo "=== Enabling Docker ==="

systemctl enable docker
systemctl start docker

echo "=== Adding ubuntu user to docker group ==="

usermod -aG docker ubuntu

echo "=== Docker installation complete ==="

docker --version

echo "=== Setup complete ==="