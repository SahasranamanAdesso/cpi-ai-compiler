# adesso AI Hub Configuration Guide

This guide explains how to configure the SAP AI Integration Compiler to use your **adesso AI Hub** instead of direct Claude API access.

---

## Quick Start

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Configure .env File

Edit `.env` and add your adesso AI Hub credentials:

```bash
# Enable adesso AI Hub
USE_ADESSO_AI_HUB=true

# Your adesso AI Hub credentials
ADESSO_AI_HUB_API_KEY=your_actual_api_key_here
ADESSO_AI_HUB_URL=https://your-ai-hub-endpoint/v1/messages

# Optional: Specify model
ADESSO_AI_HUB_MODEL=claude-3-5-sonnet-20241022
```

### 3. Run the Demo

```bash
npm run demo
```

You should see:

```
═══════════════════════════════════════════════════════════════
🚀 SAP AI Integration Compiler - Demo Server
═══════════════════════════════════════════════════════════════

   Server running at: http://localhost:3000
   AI Provider: adesso AI Hub ✅

   Open your browser to http://localhost:3000

═══════════════════════════════════════════════════════════════
```

---

## Configuration Details

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `USE_ADESSO_AI_HUB` | Enable adesso AI Hub | `true` |
| `ADESSO_AI_HUB_API_KEY` | Your API key from adesso AI Hub | `aih_xxx...` |
| `ADESSO_AI_HUB_URL` | API endpoint URL | `https://ai-hub.adesso.de/v1/messages` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADESSO_AI_HUB_MODEL` | Model to use | `claude-3-5-sonnet-20241022` |
| `PORT` | Demo server port | `3000` |

---

## Getting Your adesso AI Hub Credentials

Contact your adesso AI Hub administrator to obtain:

1. **API Key** - Your authentication token
2. **API URL** - The endpoint for your AI Hub instance
3. **Available Models** - List of models you can access

---

## Supported Response Formats

The `AdessoAIHubProvider` supports multiple response formats:

### 1. Claude Format (Recommended)

```json
{
  "content": [
    {
      "type": "text",
      "text": "generated code here"
    }
  ],
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567
  }
}
```

### 2. OpenAI Format

```json
{
  "choices": [
    {
      "message": {
        "content": "generated code here"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 567
  }
}
```

### 3. Simple Format

```json
{
  "text": "generated code here",
  "prompt_tokens": 1234,
  "completion_tokens": 567
}
```

---

## Request Format

The provider sends requests in Anthropic Messages API format:

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4096,
  "temperature": 0,
  "messages": [
    {
      "role": "user",
      "content": "prompt here"
    }
  ]
}
```

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer {your_api_key}`
- `anthropic-version: 2023-06-01`

---

## Switching Between Providers

### Use adesso AI Hub

```bash
# .env
USE_ADESSO_AI_HUB=true
ADESSO_AI_HUB_API_KEY=your_key
ADESSO_AI_HUB_URL=your_url
```

### Use Claude API Directly

```bash
# .env
USE_ADESSO_AI_HUB=false
ANTHROPIC_API_KEY=sk-ant-xxx
```

Or simply omit `USE_ADESSO_AI_HUB` (defaults to Claude):

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxx
```

---

## Troubleshooting

### Error: "adesso AI Hub configuration incomplete"

**Cause:** Missing required environment variables

**Fix:** Ensure `.env` contains:
```bash
USE_ADESSO_AI_HUB=true
ADESSO_AI_HUB_API_KEY=your_key
ADESSO_AI_HUB_URL=your_url
```

---

### Error: "adesso AI Hub API error (401)"

**Cause:** Invalid API key

**Fix:** 
1. Verify your API key is correct
2. Check if key has expired
3. Contact adesso AI Hub administrator

---

### Error: "adesso AI Hub API error (404)"

**Cause:** Incorrect API URL

**Fix:** Verify the URL format. Should be similar to:
```
https://your-domain/v1/messages
```

---

### Error: "Invalid response format from adesso AI Hub"

**Cause:** AI Hub returned unexpected response structure

**Fix:** 
1. Check AI Hub documentation for response format
2. Contact adesso AI Hub administrator
3. Update `AdessoAIHubProvider.ts` to handle the format

---

### Provider Name Shows as "adesso AI Hub" but using wrong endpoint

**Cause:** `.env` configuration issue

**Fix:** Check `.env` file is in project root and properly formatted

---

## Architecture

### Provider Interface

Both `ClaudeProvider` and `AdessoAIHubProvider` implement the same `AIProvider` interface:

```typescript
interface AIProvider {
    generate(prompt: string): Promise<AIProviderResponse>;
}
```

### Response Format

```typescript
interface AIProviderResponse {
    content: string;           // Generated TypeScript code
    provider: string;          // "adesso AI Hub" or "Claude"
    model: string;             // Model name used
    promptTokens?: number;     // Input tokens
    completionTokens?: number; // Output tokens
}
```

---

## Security Best Practices

### 1. Never Commit `.env` File

The `.env` file is in `.gitignore` - never commit it to version control.

### 2. Rotate API Keys Regularly

Follow your organization's key rotation policy.

### 3. Use Environment-Specific Keys

- Development: Use dev/test API keys
- Production: Use production API keys
- Demo: Use demo-specific keys with rate limits

### 4. Restrict API Key Permissions

If possible, limit API key permissions to only what's needed:
- Model access
- Token limits
- Rate limits

---

## Example .env Files

### Development

```bash
USE_ADESSO_AI_HUB=true
ADESSO_AI_HUB_API_KEY=dev_key_here
ADESSO_AI_HUB_URL=https://ai-hub-dev.adesso.de/v1/messages
ADESSO_AI_HUB_MODEL=claude-3-5-sonnet-20241022
PORT=3000
```

### Production

```bash
USE_ADESSO_AI_HUB=true
ADESSO_AI_HUB_API_KEY=prod_key_here
ADESSO_AI_HUB_URL=https://ai-hub.adesso.de/v1/messages
ADESSO_AI_HUB_MODEL=claude-3-5-sonnet-20241022
PORT=8080
```

### Fallback to Claude

```bash
USE_ADESSO_AI_HUB=false
ANTHROPIC_API_KEY=sk-ant-xxx
PORT=3000
```

---

## Monitoring

### Check Provider in Use

When server starts, check the console output:

```
AI Provider: adesso AI Hub ✅     ← Using adesso AI Hub
AI Provider: Claude API ✅        ← Using Claude directly
```

### Token Usage

The frontend displays token usage for each generation:

- **Prompt tokens** - Input tokens
- **Completion tokens** - Output tokens
- **Total tokens** - Sum of both

This helps track API usage and costs.

---

## Support

### Internal Support

Contact your adesso AI Hub administrator for:
- API key issues
- Access problems
- Rate limit increases
- Model availability

### Technical Issues

For SDK/compiler issues:
- Check `DEMO_GUIDE.md`
- Review `demo/README.md`
- Contact the development team

---

## Advantages of Using adesso AI Hub

✅ **Centralized Billing** - Organization-wide cost tracking  
✅ **Access Control** - Managed permissions  
✅ **Rate Limiting** - Controlled usage  
✅ **Audit Logging** - Track all API calls  
✅ **Model Access** - Access to multiple AI models  
✅ **Compliance** - Meets enterprise security requirements  

---

**Your SAP AI Integration Compiler is now configured to use adesso AI Hub!** ✅
