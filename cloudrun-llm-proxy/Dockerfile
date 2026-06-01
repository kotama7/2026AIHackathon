# Cloud Run 用 Tailscale プロキシ (方式C)。
# tailnet に参加し、OpenAI 互換リクエストを private な Ollama へ転送する。
# Ollama は公開しない (Cloud Run だけが tailnet 経由で到達)。
FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && curl -fsSL https://tailscale.com/install.sh | sh \
  && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY proxy.mjs start.sh ./
RUN chmod +x start.sh

# Cloud Run は $PORT を注入 (既定 8080)
ENV PORT=8080
CMD ["./start.sh"]
