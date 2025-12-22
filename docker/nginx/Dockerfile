FROM debian:bookworm-slim AS build

ARG NGINX_VERSION=1.24.0
ARG MODSEC_VERSION=v3.0.10
ARG MODSEC_NGINX_VERSION=master
ARG CRS_VERSION=3.3.0

ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
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
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /tmp

# Build libmodsecurity (ModSecurity v3)
RUN git clone --branch ${MODSEC_VERSION} https://github.com/SpiderLabs/ModSecurity.git modsecurity \
	&& cd modsecurity \
	&& git submodule init && git submodule update --recursive \
	&& chmod +x build.sh || true \
	&& ./build.sh \
	&& echo "--- after build.sh: listing top-level files ---" \
	&& ls -la . || true \
	&& echo "--- attempting autotools build (./configure && make) ---" \
	&& if [ -f ./configure ]; then ./configure --enable-shared --disable-static || true; fi \
	&& if [ -f Makefile ]; then make -j$(nproc) || true; fi \
	&& if [ -f src/.libs/libmodsecurity.so ] || [ -f src/.libs/libmodsecurity.a ]; then make install || true; else echo "[modsecurity build] build artifacts not found; listing src/" && ls -la src || true; fi

# Clone ModSecurity Nginx connector
RUN git clone --depth 1 --branch ${MODSEC_NGINX_VERSION} https://github.com/SpiderLabs/ModSecurity-nginx.git modsecurity-nginx

# Download and extract Nginx sources
RUN wget -q https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz \
	&& tar xzf nginx-${NGINX_VERSION}.tar.gz

# Build nginx with modsecurity connector as dynamic module
WORKDIR /tmp/nginx-${NGINX_VERSION}
RUN ./configure \
	--with-compat \
	--with-http_ssl_module \
	--with-http_v2_module \
	--with-http_gzip_static_module \
	--add-dynamic-module=/tmp/modsecurity-nginx \
	&& make -j$(nproc) \
	&& make install

# Final runtime image
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	libpcre3 \
	zlib1g \
	libssl3 \
	curl \
	&& rm -rf /var/lib/apt/lists/*

# Copy nginx install tree from build stage
COPY --from=build /usr/local/nginx /usr/local/nginx

# Provide a conventional location for the nginx binary
RUN mkdir -p /usr/sbin \
	&& ln -sf /usr/local/nginx/sbin/nginx /usr/sbin/nginx

# Create modsec config dir and copy example includes
RUN mkdir -p /etc/nginx/modsec

# Fetch OWASP CRS during image build for runtime use
RUN set -eux; \
	CRS_DIR=/etc/nginx/modsec/crs; \
	mkdir -p "$CRS_DIR"; \
	curl -fsSL https://github.com/coreruleset/coreruleset/archive/refs/tags/v3.3.0.tar.gz -o /tmp/crs.tar.gz; \
	tar -C /tmp -xzf /tmp/crs.tar.gz; \
	mv /tmp/coreruleset-3.3.0/crs-3.3.0/ "$CRS_DIR" 2>/dev/null || true; \
	# Provide default modsecurity include placeholder (will be symlinked by entrypoint)
	echo "# modsec include managed by entrypoint" > /etc/nginx/modsec/modsec_includes.conf

# Copy entrypoint and configs from repo
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY modsec/ /etc/nginx/modsec/
COPY conf.d/ /etc/nginx/conf.d/
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/sbin/nginx", "-g", "daemon off;"]
