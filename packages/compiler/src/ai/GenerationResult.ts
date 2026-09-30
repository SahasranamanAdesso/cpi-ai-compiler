import { ValidationResult } from './FlowValidator';

/**
 * GenerationResult - Result of AI-powered code generation
 *
 * This model provides detailed information about the generation process,
 * including telemetry data for monitoring and optimization.
 *
 * Version 1.1 Phase 1: Basic result with validation
 * Future versions: Token usage, timing, cost tracking
 */
export interface GenerationResult {
    /**
     * Whether generation and validation succeeded
     */
    success: boolean;

    /**
     * Generated TypeScript code (may be invalid if success is false)
     */
    code: string;

    /**
     * List of errors (empty if success is true)
     */
    errors: string[];

    /**
     * AI provider used (e.g., "Claude", "OpenAI", "Gemini")
     */
    provider: string;

    /**
     * Model identifier (e.g., "claude-3-5-sonnet-20241022")
     */
    model: string;

    /**
     * Prompt tokens consumed (if available from provider)
     * Used for cost tracking and optimization
     */
    promptTokens?: number;

    /**
     * Completion tokens generated (if available from provider)
     * Used for cost tracking and optimization
     */
    completionTokens?: number;

    /**
     * Total elapsed time in milliseconds
     * Useful for performance monitoring
     */
    elapsedMs?: number;

    /**
     * Detailed validation result (if validation was performed)
     */
    validationResult?: ValidationResult;
}
