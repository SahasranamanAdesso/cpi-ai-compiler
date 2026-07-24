import { Resource } from "./Resource";

/**
 * GroovyResource - Represents a Groovy script artifact
 *
 * Groovy scripts are external files referenced by GroovyScript components.
 * They are packaged in the Integration Flow bundle under the script/ directory.
 *
 * In SAP Integration Suite:
 * - Location: src/main/resources/script/{name}.groovy
 * - Referenced by: scriptReference property in CallActivity
 * - Execution: Runtime Groovy engine with message context access
 *
 * Architecture:
 * - This class implements the generic Resource interface
 * - Content can be provided inline or loaded from filesystem
 * - Packager handles ZIP bundle integration
 *
 * Example usage:
 * ```typescript
 * // Inline content
 * const script = new GroovyResource(
 *     "transform.groovy",
 *     `import com.sap.gateway.ip.core.customdev.util.Message
 *
 * def Message processData(Message message) {
 *     def body = message.getBody(String.class)
 *     message.setBody(body.toUpperCase())
 *     return message
 * }`
 * );
 *
 * // From filesystem
 * const script = new GroovyResource(
 *     "transform.groovy",
 *     undefined,
 *     "./scripts/transform.groovy"
 * );
 * ```
 *
 * Package structure:
 * ```
 * IntegrationFlow.zip
 * └── src/main/resources/
 *     └── script/
 *         └── transform.groovy
 * ```
 */
export class GroovyResource implements Resource {

    public readonly type: string = "groovy";
    public readonly name: string;
    public readonly content?: string;
    public readonly filePath?: string;

    /**
     * Creates a new Groovy script resource
     *
     * @param name - Script filename (e.g., "transform.groovy")
     * @param content - Optional inline script content
     * @param filePath - Optional filesystem path to load script from
     *
     * Note: Provide either content OR filePath, not both.
     * If both are provided, content takes precedence.
     *
     * @example
     * ```typescript
     * // Inline script
     * const script = new GroovyResource(
     *     "simple.groovy",
     *     "def body = message.getBody(String.class)"
     * );
     *
     * // From file
     * const script = new GroovyResource(
     *     "complex.groovy",
     *     undefined,
     *     "./scripts/complex.groovy"
     * );
     * ```
     */
    constructor(
        name: string,
        content?: string,
        filePath?: string
    ) {
        if (!name.endsWith('.groovy')) {
            throw new Error(`Groovy script name must end with .groovy: ${name}`);
        }

        if (!content && !filePath) {
            throw new Error(`GroovyResource must have either content or filePath: ${name}`);
        }

        this.name = name;
        this.content = content;
        this.filePath = filePath;
    }

    /**
     * Gets the script content
     *
     * Returns inline content if available, otherwise reads from filePath.
     *
     * @returns Script content as string
     * @throws Error if filePath doesn't exist
     */
    public getContent(): string {
        if (this.content) {
            return this.content;
        }

        if (this.filePath) {
            const fs = require('fs');
            if (!fs.existsSync(this.filePath)) {
                throw new Error(`Groovy script file not found: ${this.filePath}`);
            }
            return fs.readFileSync(this.filePath, 'utf-8');
        }

        throw new Error(`GroovyResource has no content or filePath: ${this.name}`);
    }

    /**
     * Gets the package path for this resource
     *
     * Returns the path where this resource should be placed in the ZIP bundle.
     *
     * @returns Package path (e.g., "src/main/resources/script/transform.groovy")
     */
    public getPackagePath(): string {
        return `src/main/resources/script/${this.name}`;
    }

    /**
     * Gets the BPMN reference path
     *
     * Returns the path used to reference this resource from BPMN XML.
     *
     * @returns BPMN reference path (e.g., "script/transform.groovy")
     */
    public getBpmnReference(): string {
        return `script/${this.name}`;
    }
}
