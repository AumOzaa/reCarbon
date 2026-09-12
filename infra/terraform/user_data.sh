#!/bin/bash

set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

# ─────────────────────────────────────
# 1. System packages
# ─────────────────────────────────────

apt-get update
apt-get upgrade -y

apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  snapd

# ─────────────────────────────────────
# 2. Snap + SSM Agent
# ─────────────────────────────────────

systemctl enable snapd
systemctl start snapd

snap wait system seed.loaded

if ! snap list amazon-ssm-agent >/dev/null 2>&1; then
  snap install amazon-ssm-agent --classic
fi

systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent
systemctl restart snap.amazon-ssm-agent.amazon-ssm-agent

# ─────────────────────────────────────
# 3. Docker
# ─────────────────────────────────────

install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc

chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
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

usermod -aG docker ubuntu

# ─────────────────────────────────────
# 4. Ollama
# ─────────────────────────────────────

curl -fsSL https://ollama.com/install.sh | sh

systemctl enable ollama
systemctl start ollama

# ─────────────────────────────────────
# 5. Allow Docker containers to reach
#    Ollama on the EC2 host
# ─────────────────────────────────────

mkdir -p /etc/systemd/system/ollama.service.d

cat > /etc/systemd/system/ollama.service.d/override.conf <<'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF

systemctl daemon-reload
systemctl restart ollama

# ─────────────────────────────────────
# 6. ReCarbon directories
# ─────────────────────────────────────

mkdir -p /opt/recarbon
chown ubuntu:ubuntu /opt/recarbon

# ─────────────────────────────────────
# 7. Pull cloud model
#    Authentication is done separately
# ─────────────────────────────────────

echo "Docker, SSM, and Ollama setup complete."