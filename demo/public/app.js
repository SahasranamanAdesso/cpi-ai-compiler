/**
 * SAP AI Integration Compiler - Demo Frontend
 *
 * Handles user interaction and orchestrates the generation workflow
 */

// DOM Elements
const promptTextarea = document.getElementById('prompt');
const generateBtn = document.getElementById('generateBtn');
const progressSection = document.getElementById('progressSection');
const errorSection = document.getElementById('errorSection');
const errorContent = document.getElementById('errorContent');
const resultSection = document.getElementById('resultSection');
const codeToggle = document.getElementById('codeToggle');
const codeContent = document.getElementById('codeContent');
const downloadBtn = document.getElementById('downloadBtn');

// Progress steps
const steps = {
    ai: document.getElementById('step-ai'),
    typescript: document.getElementById('step-typescript'),
    validate: document.getElementById('step-validate'),
    compile: document.getElementById('step-compile'),
    package: document.getElementById('step-package'),
    complete: document.getElementById('step-complete')
};

// State
let generatedZipData = null;
let generatedFileName = null;

/**
 * Initialize demo with example prompt
 */
function init() {
    const examplePrompt = `Create an Integration Flow that receives an HTTP request, sets the body to "Hello from AI", and sends it to an HTTPS receiver.`;
    promptTextarea.value = examplePrompt;

    // Event listeners
    generateBtn.addEventListener('click', handleGenerate);
    codeToggle.addEventListener('click', toggleCode);
    downloadBtn.addEventListener('click', handleDownload);
}

/**
 * Handle Generate button click
 */
async function handleGenerate() {
    const prompt = promptTextarea.value.trim();

    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }

    // Reset UI
    resetUI();

    // Disable button
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    // Show progress
    progressSection.classList.remove('hidden');

    try {
        // Simulate step-by-step progress with realistic timing
        await simulateProgress();

        // Call backend API
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        const result = await response.json();

        if (!result.success) {
            showError(result.errors || ['Generation failed']);
            return;
        }

        // Mark complete
        markStepComplete('complete');

        // Store ZIP data
        generatedZipData = result.zipFile;
        generatedFileName = result.fileName;

        // Show results
        showResults(result);

    } catch (error) {
        showError([error.message || 'Network error occurred']);
    } finally {
        // Re-enable button
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Integration Flow';
    }
}

/**
 * Simulate progress steps
 */
async function simulateProgress() {
    // Step 1: Calling AI
    markStepActive('ai');
    await delay(500);
    markStepComplete('ai');

    // Step 2: Generating TypeScript
    markStepActive('typescript');
    await delay(2000); // AI takes longest
    markStepComplete('typescript');

    // Step 3: Validating
    markStepActive('validate');
    await delay(300);
    markStepComplete('validate');

    // Step 4: Compiling
    markStepActive('compile');
    await delay(400);
    markStepComplete('compile');

    // Step 5: Packaging
    markStepActive('package');
    await delay(300);
    markStepComplete('package');
}

/**
 * Mark step as active
 */
function markStepActive(stepKey) {
    const step = steps[stepKey];
    step.classList.add('active');
    step.querySelector('.step-icon').textContent = '⟳';
}

/**
 * Mark step as complete
 */
function markStepComplete(stepKey) {
    const step = steps[stepKey];
    step.classList.remove('active');
    step.classList.add('complete');
    step.querySelector('.step-icon').textContent = '✓';
}

/**
 * Show error message
 */
function showError(errors) {
    errorContent.textContent = errors.join('\n');
    errorSection.classList.remove('hidden');
    progressSection.classList.add('hidden');
}

/**
 * Show results
 */
function showResults(result) {
    // Populate metadata
    document.getElementById('flowName').textContent = result.flowName || 'N/A';
    document.getElementById('executionTime').textContent = result.executionTime
        ? `${result.executionTime}ms`
        : 'N/A';
    document.getElementById('provider').textContent = result.provider || 'N/A';
    document.getElementById('model').textContent = result.model || 'N/A';
    document.getElementById('tokens').textContent = result.tokens
        ? result.tokens.toLocaleString()
        : 'N/A';

    // Populate generated code
    document.getElementById('generatedCode').textContent = result.generatedCode || 'Not available';

    // Show result section
    resultSection.classList.remove('hidden');

    // Scroll to results
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Toggle code section
 */
function toggleCode() {
    const isOpen = codeContent.classList.toggle('hidden');
    codeToggle.classList.toggle('open');
}

/**
 * Handle ZIP download
 */
function handleDownload() {
    if (!generatedZipData || !generatedFileName) {
        alert('No ZIP file available');
        return;
    }

    // Convert base64 to blob
    const byteCharacters = atob(generatedZipData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/zip' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Reset UI to initial state
 */
function resetUI() {
    // Hide sections
    progressSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    resultSection.classList.add('hidden');

    // Reset progress steps
    Object.values(steps).forEach(step => {
        step.classList.remove('active', 'complete');
        step.querySelector('.step-icon').textContent = '□';
    });

    // Reset state
    generatedZipData = null;
    generatedFileName = null;
}

/**
 * Delay helper
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
