/**
 * AIProviderResponse - Response from AI provider
 *
 * Extended response model that includes generated code plus
 * telemetry data for monitoring and cost tracking.
 *
 * Providers should populate fields where available.
 * Optional fields can be left undefined if not supported.
 */
export interface AIProviderResponse {
    /**
     * Generated content (TypeScript code)
     */
    content: string;

    /**
     * Provider name (e.g., "Claude", "OpenAI")
     */
    provider: string;

    /**
     * Model identifier (e.g., "claude-3-5-sonnet-20241022")
     */
    model: string;

    /**
     * Prompt tokens consumed (if available)
     * Useful for cost tracking
     */
    promptTokens?: number;

    /**
     * Completion tokens generated (if available)
     * Useful for cost tracking
     */
    completionTokens?: number;
}
