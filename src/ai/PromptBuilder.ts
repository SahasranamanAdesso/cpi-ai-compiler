import * as fs from 'fs';
import * as path from 'path';
import { SupportedComponents, ComponentDefinition } from './SupportedComponents';

/**
 * PromptBuilder - Constructs prompts for AI-generated Integration Flow code
 *
 * This class builds the system prompt that instructs the LLM to generate
 * valid TypeScript using the SAP Integration SDK.
 *
 * Version: 1.0
 *
 * Prompt versioning allows future evolution without breaking existing behavior.
 * When prompt structure changes significantly, increment the version.
 *
 * Responsibilities:
 * - Load prompt templates from markdown files
 * - Generate component documentation dynamically from SupportedComponents
 * - Assemble complete prompt from templates
 * - Inject user request
 *
 * Non-Responsibilities:
 * - Validating generated code (FlowValidator handles this)
 * - Invoking the LLM (AIProvider handles this)
 * - Compiling the code (Compiler handles this)
 */
export class PromptBuilder {

    /**
     * Prompt version - increment when prompt structure changes significantly
     */
    public readonly version = '1.0';

    private readonly templatesDir: string;

    constructor() {
        this.templatesDir = path.join(__dirname, 'templates');
    }

    /**
     * Builds a complete prompt for generating Integration Flow TypeScript
     *
     * The prompt includes:
     * - System instructions (from template)
     * - SDK classes documentation (from template)
     * - Component documentation (generated from SupportedComponents)
     * - Example code patterns (from template)
     * - User's natural language requirement
     *
     * @param userRequest - Natural language description of desired Integration Flow
     * @returns Complete prompt ready to send to LLM
     *
     * @example
     * const builder = new PromptBuilder();
     * const prompt = builder.build("Create a flow that receives HTTPS requests and logs the body");
     * // Returns complete prompt with system instructions + user request
     */
    build(userRequest: string): string {
        const sections: string[] = [];

        // Section 1: System instructions
        sections.push(this.loadTemplate('system.md'));

        // Section 2: SDK classes
        sections.push(this.loadTemplate('sdk-classes.md'));

        // Section 3: Supported components (dynamically generated)
        sections.push(this.buildComponentsDocumentation());

        // Section 4: Examples
        sections.push(this.loadTemplate('examples.md'));

        // Section 5: User request
        sections.push(this.buildUserInstructions(userRequest));

        return sections.join('\n\n---\n\n');
    }

    /**
     * Load a template file from the templates directory
     */
    private loadTemplate(filename: string): string {
        const templatePath = path.join(this.templatesDir, filename);
        try {
            return fs.readFileSync(templatePath, 'utf-8');
        } catch (error) {
            throw new Error(
                `Failed to load prompt template: ${filename}. ` +
                `Ensure template files exist in ${this.templatesDir}`
            );
        }
    }

    /**
     * Generates component documentation dynamically from SupportedComponents
     *
     * This ensures the prompt always reflects the current compiler capabilities.
     * When new components are added to SupportedComponents, they automatically
     * appear in the prompt.
     */
    private buildComponentsDocumentation(): string {
        const sections: string[] = [
            '# Supported Component Types (Version 1.0)',
            '',
            'These are the ONLY component types you can use.',
            'The compiler does not support any other types.',
            ''
        ];

        SupportedComponents.forEach((component, index) => {
            sections.push(`## ${index + 1}. ${component.displayName} (Type: "${component.type}")`);
            sections.push('');
            sections.push(`**Purpose:** ${component.description}`);
            sections.push('');

            if (component.requiredProperties.length > 0) {
                sections.push('**Required Properties:**');
                component.requiredProperties.forEach(prop => {
                    sections.push(`- \`${prop.name}: ${prop.type}\` - ${prop.description}`);
                    if (prop.exampleValue) {
                        sections.push(`  Example: \`${prop.exampleValue}\``);
                    }
                });
                sections.push('');
            }

            sections.push('**Example:**');
            sections.push('```');
            sections.push(component.example);
            sections.push('```');
            sections.push('');
        });

        return sections.join('\n');
    }

    /**
     * Formats the user's request into the prompt
     */
    private buildUserInstructions(userRequest: string): string {
        return `# User Request

${userRequest}

## Your Task

Generate the TypeScript code using the SAP Integration SDK.
Return ONLY the TypeScript code, no explanations.`;
    }
}
