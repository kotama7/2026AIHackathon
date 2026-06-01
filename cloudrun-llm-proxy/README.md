# Cloud Run + Tailscale LLM プロキシ (方式C)

Ollama を**公開せず**、tailnet 経由で Cloud Run から private 到達するためのプロキシ。
Firebase Functions は Gemini の代わりに、この Cloud Run の URL (`/v1`) を `LLM_BASE_URL` として呼ぶ。

```
Functions → (HTTPS, IAM/トークン) → Cloud Run プロキシ(tailnet参加) → (tailnet private) → Ollama
```

## 必要な入力 (あなたが用意)

1. **Tailscale auth key** (ephemeral, reusable 推奨): https://login.tailscale.com/admin/settings/keys
2. **Ollama の tailnet アドレス**: 例 `http://sakaki.<tailnet>.ts.net:11434`
   - 前提: Ollama を `OLLAMA_HOST=0.0.0.0:11434` で起動 (localhost バインドだと tailnet から不可)
3. **モデル名**: 例 `llama3.1`

## デプロイ

```bash
PROJECT=aihackathon-8b383
REGION=asia-northeast1
TOKEN=$(openssl rand -hex 24)   # Functions ↔ Cloud Run のアプリ層トークン

# 1) ビルド (Cloud Build)
gcloud builds submit cloudrun-llm-proxy --tag "$REGION-docker.pkg.dev/$PROJECT/gcf-artifacts/llm-proxy" --project "$PROJECT"

# 2) デプロイ (allUsers 不可。Functions の SA のみ invoker 許可)
gcloud run deploy llm-proxy \
  --image "$REGION-docker.pkg.dev/$PROJECT/gcf-artifacts/llm-proxy" \
  --region "$REGION" --project "$PROJECT" --no-allow-unauthenticated \
  --set-env-vars "OLLAMA_URL=http://<host>.<tailnet>.ts.net:11434,PROXY_TOKEN=$TOKEN,TS_HOSTNAME=cloudrun-llm-proxy" \
  --set-env-vars "TS_AUTHKEY=<tailscale-auth-key>"

# 3) Functions の SA に Cloud Run invoker を付与 (allUsers は付けない)
gcloud run services add-iam-policy-binding llm-proxy --region "$REGION" --project "$PROJECT" \
  --member "serviceAccount:820514003058-compute@developer.gserviceaccount.com" --role roles/run.invoker

# 4) Functions に LLM 設定 (functions/.env もしくは Secret)
#    LLM_BASE_URL=https://<cloud-run-url>/v1
#    LLM_MODEL=llama3.1
#    LLM_API_KEY=$TOKEN   (= PROXY_TOKEN)
```

## セキュリティ

- Ollama は tailnet 内のみ。インターネット非公開。
- Cloud Run は `--no-allow-unauthenticated`（Functions の SA だけ呼べる）＋ アプリ層 `PROXY_TOKEN`。
- TS_AUTHKEY は ephemeral 推奨 (コンテナ停止で tailnet から自動失効)。Secret 管理が望ましい。
