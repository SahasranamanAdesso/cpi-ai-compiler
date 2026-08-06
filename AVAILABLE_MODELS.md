# Available Models - adesso AI Hub

Your adesso AI Hub team has access to the following models:

---

## Recommended Models for SAP Integration Compiler

### Claude Sonnet 4.6 (Recommended)
```bash
ADESSO_AI_HUB_MODEL=claude-sonnet-4-6
```
- **Best for:** Production use
- **Strengths:** Balance of quality and speed
- **Cost:** Medium

### Claude Sonnet 5
```bash
ADESSO_AI_HUB_MODEL=claude-sonnet-5
```
- **Best for:** Complex flows
- **Strengths:** Advanced reasoning
- **Cost:** Higher

### Claude Opus 4.8
```bash
ADESSO_AI_HUB_MODEL=claude-opus-4-8
```
- **Best for:** Maximum quality
- **Strengths:** Best reasoning, most accurate
- **Cost:** Highest

### Claude Haiku 4.5
```bash
ADESSO_AI_HUB_MODEL=claude-haiku-4-5
```
- **Best for:** Simple flows, development
- **Strengths:** Very fast, low cost
- **Cost:** Lowest

---

## All Available Models

### Claude Models (Anthropic)
- `claude-sonnet-4-5*`
- `claude-sonnet-4-6*` ✅ **Currently Used**
- `claude-sonnet-5*`
- `claude-opus-4-5*`
- `claude-opus-4-6*`
- `claude-opus-4-7*`
- `claude-opus-4-8*`
- `claude-haiku-4-5*`

### GPT Models (OpenAI)
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4.1-nano`
- `gpt-4o`
- `gpt-5`
- `gpt-5-mini`
- `gpt-5-nano`
- `gpt-5.1`
- `gpt-5.4`
- `gpt-5.5`
- `gpt-oss-120b`
- `gpt-oss-20b`

### Gemini Models (Google)
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `gemini-3.5-flash`
- `US-gemini-3-flash-preview`
- `US-gemini-3.1-pro-preview`
- `US-gemini-3.1-flash-image-preview`
- `gemini-2.5-flash-image`

### Other Models
- `llama-3-3-70b` (Meta)
- `qwen3-235b` (Alibaba)
- `qwen3-coder-480b` (Alibaba)
- `qwen-3.6-35b-sovereign`
- `deepseek-v4-flash-sovereign`
- `devstral-2-123b` (Mistral)
- `nemotron-3-super-120b` (NVIDIA)
- `o3-mini` (OpenAI)
- `o4-mini` (OpenAI)

### Embedding Models
- `text-embedding-3-large` (OpenAI)
- `intfloat/e5-mistral-7b-instruct`
- `qwen-3-vl-embedding-2b-sovereign`
- `titan-embed-text-v2` (AWS)

---

## Changing Models

Edit your `.env` file:

```bash
ADESSO_AI_HUB_MODEL=claude-sonnet-4-6
```

Then restart the demo server:

```bash
npm run demo
```

---

## Model Selection Guide

### For SAP Integration Flow Generation

**Development/Testing:**
- Use: `claude-haiku-4-5`
- Why: Fast, cheap, good for simple flows

**Production:**
- Use: `claude-sonnet-4-6` ✅
- Why: Best balance of quality and cost

**Complex Scenarios:**
- Use: `claude-opus-4-8`
- Why: Best reasoning for multi-step flows

**Budget-Conscious:**
- Use: `gpt-4.1-mini` or `gemini-2.5-flash`
- Why: Lower cost alternatives

---

## Model Wildcards

Models with `*` support wildcard matching:
- `claude-sonnet-4-5*` matches `claude-sonnet-4-5`, `claude-sonnet-4-5-alpha`, etc.
- `claude-sonnet-4-6*` matches `claude-sonnet-4-6`, `claude-sonnet-4-6-20250101`, etc.

You can use either:
```bash
ADESSO_AI_HUB_MODEL=claude-sonnet-4-6
# or
ADESSO_AI_HUB_MODEL=claude-sonnet-4-6-20250101
```

---

## Testing Different Models

Create a test script to compare models:

```bash
# Test Haiku (fast)
ADESSO_AI_HUB_MODEL=claude-haiku-4-5 npm run demo

# Test Sonnet (balanced)
ADESSO_AI_HUB_MODEL=claude-sonnet-4-6 npm run demo

# Test Opus (quality)
ADESSO_AI_HUB_MODEL=claude-opus-4-8 npm run demo
```

Compare:
- **Speed** - How fast does it generate?
- **Quality** - How accurate is the code?
- **Cost** - Token usage shown in results

---

## Troubleshooting

### Error: "team not allowed to access model"

**Cause:** Model not in your allowed list

**Fix:** Choose a model from the list above

### Error: "model not found"

**Cause:** Typo in model name

**Fix:** Double-check spelling (case-sensitive)

---

## Current Configuration

Your `.env` is currently set to:

```bash
ADESSO_AI_HUB_MODEL=claude-sonnet-4-6
```

This is **Claude Sonnet 4.6** - an excellent choice for production use!

---

**Recommendation: Stick with `claude-sonnet-4-6` for best results.** ✅
