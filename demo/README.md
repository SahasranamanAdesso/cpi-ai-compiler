# SAP AI Integration Compiler - Demo Application

**Natural Language → SAP Integration Suite**

A lightweight demonstration application showcasing the end-to-end capability of generating SAP Integration Suite projects from natural language prompts.

---

## Purpose

This demo is designed for presenting to management and stakeholders. It demonstrates:

- Natural language input
- Real-time AI generation
- TypeScript code generation
- Automatic compilation to BPMN
- Downloadable SAP Integration Suite project (.zip)

---

## Technology Stack

- **Backend:** Node.js + Express
- **Frontend:** HTML + CSS + Vanilla JavaScript
- **AI:** Claude API (Anthropic)
- **Compiler:** Existing SAP Integration SDK compiler (v1.0)

---

## Prerequisites

1. Node.js (v16 or higher)
2. Anthropic API key

---

## Setup

### 1. Install Dependencies

```bash
cd C:\Sahas\adesso\CPI_AI\sap-integration-sdk
npm install
npm install express --save
npm install @types/express --save-dev
```

### 2. Configure API Key

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. Build TypeScript

```bash
npm run build
```

---

## Running the Demo

### Start the Demo Server

```bash
npm run demo
```

This will:
1. Start the Express server on `http://localhost:3000`
2. Serve the demo UI
3. Enable the `/api/generate` endpoint

### Access the Demo

Open your browser to:

```
http://localhost:3000
```

---

## Using the Demo

### 1. Enter a Prompt

The demo includes an example prompt:

```
Create an Integration Flow that receives an HTTP request, 
sets the body to "Hello from AI", and sends it to an HTTPS receiver.
```

You can modify this or enter your own prompt.

### 2. Generate

Click **"Generate Integration Flow"**

The UI will show real-time progress:

```
✓ Calling AI Provider
✓ Generating TypeScript
✓ Validating Code
✓ Compiling to BPMN
✓ Packaging Project
✓ Complete
```

### 3. Review Results

The demo displays:

- **Flow Name** - Generated Integration Flow name
- **Execution Time** - Total time in milliseconds
- **AI Provider** - Claude
- **Model** - claude-3-5-sonnet-20241022
- **Tokens** - Total tokens used
- **Generated TypeScript** - Collapsible code view

### 4. Download ZIP

Click **"Download ZIP"** to download the generated SAP Integration Suite project.

### 5. Import to SAP

Follow the instructions shown in the demo:

1. Open SAP Integration Suite
2. Navigate to **Design → Integrations**
3. Click **Import**
4. Upload the generated ZIP file
5. Open in graphical editor ✅

---

## API Endpoint

### POST /api/generate

Generates an Integration Flow from a natural language prompt.

**Request:**
```json
{
  "prompt": "Create a flow that..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "zipFile": "base64-encoded-zip",
  "fileName": "MyFlow.zip",
  "generatedCode": "typescript code",
  "executionTime": 2345,
  "flowName": "MyFlow",
  "provider": "Claude",
  "model": "claude-3-5-sonnet-20241022",
  "tokens": 1801
}
```

**Response (Error):**
```json
{
  "success": false,
  "errors": ["Error message"]
}
```

---

## Architecture

The demo orchestrates existing components:

```
User Input (Natural Language)
        ↓
Express Server (/api/generate)
        ↓
IntegrationFlowGenerator
        ↓
AIPipeline → AI Provider (Claude)
        ↓
Generated TypeScript
        ↓
CodeExecutor
        ↓
IFlow instance
        ↓
BpmnProcessMapper (Compiler v1.0)
        ↓
BpmnDefinitions (IR)
        ↓
IflowSerializer
        ↓
IflowPackager
        ↓
.zip file (base64)
        ↓
Frontend (Download)
        ↓
SAP Integration Suite (Import)
```

---

## File Structure

```
demo/
├── server.ts                  Express server
├── public/
│   ├── index.html            Demo UI
│   ├── style.css             Styling
│   └── app.js                Frontend logic
└── README.md                 This file
```

---

## Features

### Real-Time Progress

The UI shows step-by-step progress with visual indicators:

- Active steps are highlighted in blue
- Completed steps are marked with ✓ in green
- Current step shows a spinning indicator

### Error Handling

If generation fails, the UI displays:

- Clear error messages
- No stack traces (user-friendly)
- Option to try again

### Collapsible Code View

Generated TypeScript code can be expanded/collapsed for review.

### Responsive Design

The demo works on desktop and tablet devices.

---

## Presentation Tips

### For Management

1. **Start with the prompt** - Show how simple the input is
2. **Highlight the progress** - Emphasize automation
3. **Show the download** - Demonstrate tangible output
4. **Import to SAP** - Prove compatibility

### Key Messages

- "Natural language becomes production-ready code"
- "Fully compatible with SAP Integration Suite"
- "Reduces development time from hours to seconds"
- "Maintains enterprise quality and standards"

---

## Limitations

### Current Version (1.1)

- Only Content Modifier component supported
- No Router, Groovy, or Data Store support
- Single-turn generation (no conversation)

### Future Versions

- v1.2: Expand component library
- v2.0: Direct deployment to SAP
- v3.0: Multi-turn conversation

---

## Troubleshooting

### Server Won't Start

**Problem:** `ANTHROPIC_API_KEY environment variable not set`

**Solution:** Create `.env` file with your API key

---

### Generation Fails

**Problem:** Network error or API timeout

**Solution:** Check internet connection and API key validity

---

### ZIP Won't Download

**Problem:** No file generated

**Solution:** Check server logs for compilation errors

---

## Development

### Run in Development Mode

```bash
npm run demo
```

### Check Server Health

```
GET http://localhost:3000/api/health
```

Returns:
```json
{
  "status": "ok",
  "apiKeyConfigured": true,
  "timestamp": "2026-07-16T..."
}
```

---

## Notes

- This is a **demo application**, not production-ready UI
- Focus is on demonstrating capability
- Code reuses all existing components
- No duplication of compiler logic
- Clean, simple, reliable

---

**The complete end-to-end workflow is now demonstrable to stakeholders.**
