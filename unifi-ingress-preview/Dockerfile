ARG BUILD_FROM=ghcr.io/hassio-addons/base:21.0.10
FROM ${BUILD_FROM}
WORKDIR /opt/unifi-ingress
RUN apk add --no-cache nodejs npm
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY app/ ./
COPY rootfs/ /
RUN chmod +x /etc/s6-overlay/s6-rc.d/unifi-ingress/run /etc/s6-overlay/s6-rc.d/unifi-ingress/finish \
    && node --check proxy.cjs && node --check shim.js && node --check transform.cjs && node --test cookies.test.cjs

