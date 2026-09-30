import { AIProvider } from '../AIProvider';
import { AIProviderResponse } from '../AIProviderResponse';

/**
 * ClaudeProvider - Anthropic Claude API implementation of AIProvider
 *
 * This provider sends prompts to Claude and returns the response.
 *
 * Responsibilities:
 * - Send prompt to Claude API
 * - Receive response
 * - Return raw response text
 *
 * Non-Responsibilities:
 * - Validation (FlowValidator handles this)
 * - Compilation (Compiler handles this)
 * - XML/BPMN generation (Compiler handles this)
 * - Prompt building (PromptBuilder handles this)
 *
 * Uses the Anthropic Messages API with Claude 3.5 Sonnet.
 *
 * @example
 * const provider = new ClaudeProvider(process.env.ANTHROPIC_API_KEY!);
 * const response = await provider.generate(prompt);
 */
export class ClaudeProvider implements AIProvider {
    private readonly apiKey: string;
    private readonly model: string = 'claude-3-5-sonnet-20241022';
    private readonly apiUrl: string = 'https://api.anthropic.com/v1/messages';

    /**
     * Creates a new ClaudeProvider
     *
     * @param apiKey - Anthropic API key
     * @param model - Optional Claude model (defaults to claude-3-5-sonnet-20241022)
     *
     * @throws Error if apiKey is not provided
     */
    constructor(apiKey: string, model?: string) {
        if (!apiKey) {
            throw new Error('Claude API key is required');
        }
        this.apiKey = apiKey;
        if (model) {
            this.model = model;
        }
    }

    /**
     * Generates TypeScript code using Claude
     *
     * Sends the prompt to Claude and returns the generated code with metadata.
     * Uses Claude 3.5 Sonnet with:
     * - Max tokens: 4096
     * - Temperature: 0 (deterministic)
     *
     * @param prompt - The complete system + user prompt
     * @returns Response with generated code and token usage
     * @throws Error if API call fails or returns unexpected format
     */
    async generate(prompt: string): Promise<AIProviderResponse> {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 4096,
                    temperature: 0, // Deterministic output
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(
                    `Claude API error (${response.status}): ${errorBody}`
                );
            }

            const data: any = await response.json();

            // Extract text from Claude response
            if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
                throw new Error('Invalid response format from Claude API');
            }

            const textContent = data.content.find((block: any) => block.type === 'text');
            if (!textContent || !textContent.text) {
                throw new Error('No text content in Claude API response');
            }

            // Return response with metadata
            return {
                content: textContent.text,
                provider: 'Claude',
                model: this.model,
                promptTokens: data.usage?.input_tokens,
                completionTokens: data.usage?.output_tokens
            };

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Claude API call failed: ${error.message}`);
            }
            throw new Error('Claude API call failed with unknown error');
        }
    }
}
