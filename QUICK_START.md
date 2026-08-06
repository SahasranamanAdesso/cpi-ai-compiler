# Quick Start - adesso AI Hub

**Get the demo running in 2 minutes**

---

## Your Configuration

Your `.env` file is already configured for **adesso AI Hub**:

```bash
USE_ADESSO_AI_HUB=true
ADESSO_AI_HUB_API_KEY=sk-qDQfqmDMt_ea7J3MXBGiDA
ADESSO_AI_HUB_URL=https://adesso-ai-hub.3asabc.de/v1/messages
ADESSO_AI_HUB_MODEL=claude-sonnet-4-6
```

✅ Configuration complete!

---

## Run the Demo

### 1. Build (if not already done)

```bash
cd C:\Sahas\adesso\CPI_AI\sap-integration-sdk
npm run build
```

### 2. Start Demo Server

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

### 3. Open Browser

Navigate to: **http://localhost:3000**

### 4. Generate Your First Flow

The demo has a pre-filled example prompt. Just click **"Generate Integration Flow"**

Watch the progress:
- ✓ Calling AI Provider
- ✓ Generating TypeScript
- ✓ Validating Code
- ✓ Compiling to BPMN
- ✓ Packaging Project
- ✓ Complete

### 5. Download ZIP

Click **"Download ZIP"** to get your SAP Integration Suite project.

### 6. Import to SAP

1. Open SAP Integration Suite
2. Navigate to Design → Integrations
3. Click Import
4. Upload the downloaded ZIP
5. Open in graphical editor ✅

---

## Try Different Prompts

### Simple Hello World
```
Create an Integration Flow that receives an HTTP request 
and sets the message body to "Hello World"
```

### Multi-Step Processing
```
Create an Integration Flow with two steps: 
first set body to "Step 1 complete", 
then set body to "Step 2 complete"
```

### Business Scenario
```
Create an Integration Flow that receives customer data via HTTPS, 
adds a welcome message, and forwards to the backend
```

---

## What You're Using

- **AI Provider:** adesso AI Hub
- **Model:** Claude Sonnet 4.6
- **Endpoint:** https://adesso-ai-hub.3asabc.de/v1/messages
- **Compiler:** SAP Integration SDK v1.0
- **Supported Components:** Content Modifier (Enricher)

> **Note:** See `AVAILABLE_MODELS.md` for other models you can use

---

## Troubleshooting

### Server won't start

Check that you're in the correct directory:
```bash
cd C:\Sahas\adesso\CPI_AI\sap-integration-sdk
```

### API Error (401 Unauthorized)

Your API key may be invalid or expired. Contact your AI Hub administrator.

### Generation Fails

1. Check your internet connection
2. Verify the AI Hub endpoint URL is correct
3. Check server console for detailed error messages

---

## Next Steps

### For More Information

- **Demo Guide:** `DEMO_GUIDE.md` - Presentation script
- **AI Hub Setup:** `ADESSO_AI_HUB_SETUP.md` - Complete configuration guide
- **Technical Docs:** `demo/README.md` - API documentation
- **Architecture:** `ARCHITECTURE.md` - System architecture

### Need Help?

- Check the documentation files listed above
- Review server console output for errors
- Contact the development team

---

**You're all set! Start generating Integration Flows from natural language.** 🚀
