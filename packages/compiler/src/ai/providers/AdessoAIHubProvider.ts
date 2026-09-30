import { AIProvider } from '../AIProvider';
import { AIProviderResponse } from '../AIProviderResponse';

/**
 * AdessoAIHubProvider - adesso AI Hub API implementation of AIProvider
 *
 * This provider sends prompts to adesso AI Hub and returns the response.
 *
 * The adesso AI Hub provides access to Claude and other models through
 * a unified API endpoint.
 *
 * @example
 * const provider = new AdessoAIHubProvider(
 *   process.env.ADESSO_AI_HUB_API_KEY!,
 *   process.env.ADESSO_AI_HUB_URL!
 * );
 * const response = await provider.generate(prompt);
 */
export class AdessoAIHubProvider implements AIProvider {
    private readonly apiKey: string;
    private readonly apiUrl: string;
    private readonly model: string;

    /**
     * Creates a new AdessoAIHubProvider
     *
     * @param apiKey - adesso AI Hub API key
     * @param apiUrl - adesso AI Hub API endpoint URL
     * @param model - Model to use (defaults to claude-3-5-sonnet-20241022)
     *
     * @throws Error if apiKey or apiUrl is not provided
     */
    constructor(apiKey: string, apiUrl: string, model?: string) {
        if (!apiKey) {
            throw new Error('adesso AI Hub API key is required');
        }
        if (!apiUrl) {
            throw new Error('adesso AI Hub API URL is required');
        }
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.model = model || 'claude-3-5-sonnet-20241022';
    }

    /**
     * Generates TypeScript code using adesso AI Hub
     *
     * Sends the prompt to adesso AI Hub and returns the generated code with metadata.
     * Configuration:
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
                    'Authorization': `Bearer ${this.apiKey}`,
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
                    `adesso AI Hub API error (${response.status}): ${errorBody}`
                );
            }

            const data: any = await response.json();

            // Extract text from response
            // Support both Claude format and generic format
            let textContent: string;
            let promptTokens: number | undefined;
            let completionTokens: number | undefined;

            if (data.content && Array.isArray(data.content)) {
                // Claude format
                const block = data.content.find((b: any) => b.type === 'text');
                if (!block || !block.text) {
                    throw new Error('No text content in AI Hub response');
                }
                textContent = block.text;
                promptTokens = data.usage?.input_tokens;
                completionTokens = data.usage?.output_tokens;
            } else if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
                // OpenAI format (if AI Hub supports multiple backends)
                textContent = data.choices[0].message?.content;
                if (!textContent) {
                    throw new Error('No text content in AI Hub response');
                }
                promptTokens = data.usage?.prompt_tokens;
                completionTokens = data.usage?.completion_tokens;
            } else if (typeof data.text === 'string') {
                // Simple format
                textContent = data.text;
                promptTokens = data.prompt_tokens;
                completionTokens = data.completion_tokens;
            } else {
                throw new Error('Invalid response format from adesso AI Hub');
            }

            // Return response with metadata
            return {
                content: textContent,
                provider: 'adesso AI Hub',
                model: this.model,
                promptTokens,
                completionTokens
            };

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`adesso AI Hub API call failed: ${error.message}`);
            }
            throw new Error('adesso AI Hub API call failed with unknown error');
        }
    }
}
