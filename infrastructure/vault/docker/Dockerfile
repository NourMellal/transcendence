FROM hashicorp/vault:1.18

# Install additional tools for bootstrap scripting
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    openssl \
    python3

# Prepare directories
RUN mkdir -p \
    /vault/data \
    /vault/logs \
    /vault/plugins \
    /vault/config \
    /vault/scripts

# Copy configuration and helper scripts
COPY config/ /vault/config/
COPY policies/ /vault/policies/
COPY simple-setup.sh /vault/scripts/simple-setup.sh
COPY docker/entrypoint.sh /vault/entrypoint.sh

RUN chmod +x /vault/scripts/simple-setup.sh /vault/entrypoint.sh

# Health check script
RUN echo '#!/bin/sh' > /vault/health-check.sh && \
    echo 'curl -s http://127.0.0.1:8200/v1/sys/health | jq -e ".sealed == false"' >> /vault/health-check.sh && \
    chmod +x /vault/health-check.sh

# Expose dev/UI ports
EXPOSE 8200 8201

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
    CMD /vault/health-check.sh || exit 1

ENTRYPOINT ["/vault/entrypoint.sh"]
