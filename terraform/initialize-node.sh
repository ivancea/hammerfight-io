#!/bin/bash

# Install Node
apt update
apt upgrade
apt install -y git curl
bash <(curl -fsSL https://deb.nodesource.com/setup_20.x)
apt install -y nodejs

# Add certificates and use HTTPS port
export SSL_CERTIFICATE="${ssl_certificate}"
export SSL_PRIVATE_KEY="${ssl_private_key}"
export PORT=443

# Clone repository
git clone https://github.com/ivancea/hammerfight-io.git
cd hammerfight-io/
git checkout ${git_commit}

# Build
npm ci
npm run build
npm run serve
