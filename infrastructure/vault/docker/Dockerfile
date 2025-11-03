FROM hashicorp/vault:1.18

# Install additional tools for development
RUN apk add --no-cache \
    curl \
    jq \
    bash \
    openssl

# Create directories
RUN mkdir -p /vault/data \
    /vault/logs \
    /vault/plugins \
    /vault/config

# Copy configuration files
COPY config/ /vault/config/

# Set proper permissions
RUN chown -R vault:vault /vault

# Create health check script
RUN echo '#!/bin/sh' > /vault/health-check.sh && \
    echo 'vault status -format=json | jq -e ".sealed == false"' >> /vault/health-check.sh && \
    chmod +x /vault/health-check.sh

# Expose ports
EXPOSE 8200 8201

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
    CMD /vault/health-check.sh || exit 1

# Default command
CMD ["vault", "server", "-config=/vault/config"]
