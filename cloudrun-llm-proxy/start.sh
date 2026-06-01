#!/usr/bin/env bash
set -euo pipefail

# tailscaled を userspace モードで起動 (Cloud Run は TUN 不可)。
# HTTP CONNECT プロキシを localhost:1055 に出し、Node からの tailnet 宛て通信を通す。
/usr/sbin/tailscaled \
  --tun=userspace-networking \
  --socks5-server=localhost:1055 \
  --outbound-http-proxy-listen=localhost:1055 \
  --state=mem: &

# tailnet 参加 (ephemeral auth key)。
until tailscale up \
  --authkey="${TS_AUTHKEY}" \
  --hostname="${TS_HOSTNAME:-cloudrun-llm-proxy}" \
  --accept-routes; do
  echo "tailscale up retrying..." >&2
  sleep 1
done
tailscale status || true

# Node の fetch を tailscale の HTTP プロキシ経由にする (tailnet 宛てを通すため)。
export TS_HTTP_PROXY="http://localhost:1055"
exec node /app/proxy.mjs
