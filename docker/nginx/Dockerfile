############################
# BUILD STAGE
############################
FROM debian:bookworm-slim AS build

ARG NGINX_VERSION=1.24.0
ARG MODSEC_VERSION=v3.0.10
ARG MODSEC_NGINX_VERSION=master

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

# --- Build libmodsecurity ---
RUN git clone --branch ${MODSEC_VERSION} https://github.com/SpiderLabs/ModSecurity.git \
    && cd ModSecurity \
    && git submodule update --init --recursive \
    && ./build.sh \
    && ./configure --enable-shared --disable-static \
    && make -j"$(nproc)" \
    && make install

# --- ModSecurity nginx connector ---
RUN git clone --depth 1 --branch ${MODSEC_NGINX_VERSION} \
    https://github.com/SpiderLabs/ModSecurity-nginx.git

# --- Build nginx ---
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
    --add-dynamic-module=/tmp/ModSecurity-nginx \
    && make -j"$(nproc)" \
    && make install

############################
# RUNTIME STAGE
############################
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
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system nginx \
 && adduser --system --no-create-home --ingroup nginx nginx

# --- Copy binaries ---
COPY --from=build /usr/local/nginx /usr/local/nginx
COPY --from=build /usr/local/lib/libmodsecurity.so* /usr/local/lib/
COPY --from=build /usr/local/include /usr/local/include

RUN ln -sf /usr/local/nginx/sbin/nginx /usr/sbin/nginx

# --- ModSecurity + CRS ---
RUN set -eux; \
    mkdir -p /etc/nginx/modsec; \
    curl -fsSL \
      "https://github.com/coreruleset/coreruleset/archive/refs/tags/v${CRS_VERSION}.tar.gz" \
      -o /tmp/crs.tar.gz; \
    tar -xzf /tmp/crs.tar.gz -C /tmp; \
    mv /tmp/coreruleset-${CRS_VERSION} /etc/nginx/modsec/crs; \
    cp /etc/nginx/modsec/crs/crs-setup.conf.example \
       /etc/nginx/modsec/crs/crs-setup.conf; \
    rm -rf /tmp/crs.tar.gz; \
    mkdir -p /etc/nginx/modsec-run

# --- Configs ---
COPY modsec/ /etc/nginx/modsec/
COPY conf.d/ /etc/nginx/conf.d/
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/api-proxy.conf /etc/nginx/conf.d/api-proxy.conf

# --- Logs ---
RUN touch /var/log/modsec_audit.log \
 && chown nginx:nginx /var/log/modsec_audit.log

RUN ldconfig

EXPOSE 80 443

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
