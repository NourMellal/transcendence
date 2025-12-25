FROM debian:bookworm-slim AS build

ARG NGINX_VERSION=1.24.0
ARG MODSEC_VERSION=v3.0.10
ARG MODSEC_NGINX_VERSION=master
ARG CRS_VERSION=3.3.0

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    git \
    cmake \
    automake \
    libtool \
    wget \
    curl \
    pkg-config \
    libpcre3-dev \
    zlib1g-dev \
    libssl-dev \
    libxml2-dev \
    libyajl-dev \
    libcurl4-openssl-dev \
    liblmdb-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp

RUN git clone --branch ${MODSEC_VERSION} https://github.com/SpiderLabs/ModSecurity.git modsecurity \
    && cd modsecurity \
    && git submodule update --init --recursive \
    && ./build.sh \
    && ./configure --enable-shared --disable-static \
    && make -j"$(nproc)" \
    && make install \
    && ldconfig

RUN git clone --depth 1 --branch ${MODSEC_NGINX_VERSION} https://github.com/SpiderLabs/ModSecurity-nginx.git modsecurity-nginx

RUN wget -q https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz \
    && tar xzf nginx-${NGINX_VERSION}.tar.gz

WORKDIR /tmp/nginx-${NGINX_VERSION}
RUN ./configure \
    --with-compat \
    --with-http_ssl_module \
    --with-http_v2_module \
    --with-http_gzip_static_module \
    --with-stream \
    --with-http_realip_module \
    --add-dynamic-module=/tmp/modsecurity-nginx \
    && make -j"$(nproc)" \
    && make install

FROM debian:bookworm-slim

ARG CRS_VERSION=3.3.0

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libpcre3 \
    zlib1g \
    libssl3 \
    libxml2 \
    libyajl2 \
    libcurl4 \
    liblmdb0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system nginx && adduser --system --no-create-home --ingroup nginx --disabled-login nginx

COPY --from=build /usr/local/nginx /usr/local/nginx
COPY --from=build /usr/local/modsecurity/lib/libmodsecurity.so* /usr/local/lib/

RUN ldconfig

RUN mkdir -p /usr/sbin \
    && ln -sf /usr/local/nginx/sbin/nginx /usr/sbin/nginx

RUN mkdir -p /etc/nginx/modsec

RUN set -eux; \
    CRS_DIR=/etc/nginx/modsec/crs; \
    mkdir -p /etc/nginx/modsec; \
    rm -rf "$CRS_DIR"; \
    curl -fsSL "https://github.com/coreruleset/coreruleset/archive/refs/tags/v${CRS_VERSION}.tar.gz" -o /tmp/crs.tar.gz; \
    tar -C /tmp -xzf /tmp/crs.tar.gz; \
    mv /tmp/coreruleset-${CRS_VERSION} "$CRS_DIR"; \
    cp "$CRS_DIR/crs-setup.conf.example" "$CRS_DIR/crs-setup.conf"; \
    rm -f "$CRS_DIR/rules/REQUEST-910-IP-REPUTATION.conf"; \
    echo "# Managed by entrypoint" > /etc/nginx/modsec/modsec_includes.conf

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY --from=build /tmp/nginx-1.24.0/conf/mime.types /etc/nginx/mime.types
COPY modsec/ /etc/nginx/modsec/
COPY conf.d/ /etc/nginx/conf.d/
COPY nginx.conf /etc/nginx/nginx.conf

RUN touch /var/log/modsec_audit.log && chown nginx:nginx /var/log/modsec_audit.log

RUN ldconfig

EXPOSE 80 443

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/sbin/nginx", "-c", "/etc/nginx/nginx.conf", "-g", "daemon off;"]
