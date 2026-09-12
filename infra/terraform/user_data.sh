#!/bin/bash

set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get upgrade -y

apt-get install -y ca-certificates curl gnupg snapd

systemctl enable snapd
systemctl start snapd

snap wait system seed.loaded

if ! snap list amazon-ssm-agent >/dev/null 2>&1; then
  snap install amazon-ssm-agent --classic
fi

systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent
systemctl restart snap.amazon-ssm-agent.amazon-ssm-agent

install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc

chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update

apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

usermod -aG docker ubuntu

mkdir -p /opt/recarbon
chown ubuntu:ubuntu /opt/recarbon

echo "Docker and SSM setup complete."
