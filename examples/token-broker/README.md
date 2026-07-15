# Token broker

Short-lived credential endpoint expected by `@ottervoice/provider-utils` `createCredentialResolver`.

Clients must **not** hold long-lived provider keys. They `POST` here; the server mints a short-lived token.

## Contract

```http
POST /api/voice/token
Content-Type: application/json

{ "provider": "deepgram", "purpose": "asr", "sessionId": "optional" }
```

```json
{ "token": "…", "url": "wss://optional", "expiresAt": 1784000000000 }
```

## Run

```bash
bun run examples/token-broker/server.ts
# default http://127.0.0.1:8787
```

### Env (optional)

| Variable | Used for |
| --- | --- |
| `PORT` | Listen port (default `8787`) |
| `AZURE_SPEECH_KEY` + `AZURE_REGION` | Real Azure STS exchange (~10 min token) |
| `DEEPGRAM_API_KEY` / `ELEVENLABS_API_KEY` / `OPENROUTER_API_KEY` | Demo returns the key as “token” — replace with each vendor’s short-lived flow before production |

## Security

This example enables open CORS and passes through configured keys for non-Azure providers. Production gateways must add auth, allowlists, quotas, and rate limits. See [Security guide](https://ottervoice.vercel.app/docs/guides/security/).

Docs: [Token broker quick start](https://ottervoice.vercel.app/docs/getting-started/token-broker/)
