# Token broker

Short-lived credential endpoint expected by `@ottervoice/provider-utils` `createCredentialResolver`.

Clients must **not** hold long-lived provider keys. They `POST` with their
application authorization; the server exchanges an Azure subscription key for
a short-lived STS token. This example never returns a configured provider key.

## Contract

```http
POST /api/voice/token
Content-Type: application/json

Authorization: Bearer <application-session-token>

{ "provider": "azure_speech", "purpose": "asr", "sessionId": "required" }
```

```json
{ "token": "…", "url": "wss://optional", "expiresAt": 1784000000000 }
```

## Run

```bash
bun run examples/token-broker/server.ts
# default http://127.0.0.1:8787
```

### Environment

| Variable | Used for |
| --- | --- |
| `PORT` | Listen port (default `8787`) |
| `AZURE_SPEECH_KEY` + `AZURE_REGION` | Real Azure STS exchange (~10 min token) |
| `TOKEN_BROKER_APP_AUTH_TOKEN` | Required demo application authorization; replace with real user/session auth |
| `TOKEN_BROKER_ALLOWED_ORIGIN` | Exact browser Origin (default `http://localhost:5173`) |

## Security

Only the implemented Azure STS exchange is enabled. Other providers return an
error until you add their documented short-lived credential flow. Never emulate
expiry by returning a long-lived key with a short `expiresAt` value.

An Azure STS token reduces secret lifetime but does **not** lock the client to a
voice, route, or budget. Treat this as an explicit direct-client mode, not the
standard production boundary. Standard web/app deployments should call an
application endpoint that keeps the Azure provider and voice policy server-side.

The demo bearer check is only a visible placeholder for application auth.
Production must validate the real user and `sessionId`, then enforce purpose,
provider, quotas, and rate limits. If the provider can issue a signed URL scoped
to a fixed route/model, return that URL rather than a broad bearer credential.
Broad OpenRouter credentials belong behind a policy gateway, not this token broker. See the
[Security guide](https://ottervoice.vercel.app/docs/guides/security/).

Docs: [Token broker quick start](https://ottervoice.vercel.app/docs/getting-started/token-broker/)
