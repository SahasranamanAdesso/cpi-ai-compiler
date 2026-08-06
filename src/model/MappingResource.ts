import { Resource } from "./Resource";

/**
 * MappingResource - Represents a Message Mapping (.mmap) artifact
 *
 * Message Mapping files define transformations between source and target message structures.
 * They are packaged in the Integration Flow bundle under the mapping/ directory.
 *
 * In SAP Integration Suite:
 * - Location: src/main/resources/mapping/{name}.mmap
 * - Referenced by: mappingpath and mappingname properties in CallActivity
 * - Execution: Runtime mapping engine with XSLT/Java transformation
 *
 * Architecture:
 * - This class implements the generic Resource interface
 * - Content can be provided inline or loaded from filesystem
 * - Packager handles ZIP bundle integration
 *
 * Example usage:
 * ```typescript
 * // Minimal .mmap content (SAP will allow graphical editing)
 * const mapping = new MappingResource(
 *     "Order_to_Invoice.mmap",
 *     `<?xml version="1.0" encoding="UTF-8"?>
 * <mapping xmlns="http://www.sap.com/mapping" version="1.0">
 *     <source>OrderMessage</source>
 *     <target>InvoiceMessage</target>
 * </mapping>`
 * );
 *
 * // From filesystem
 * const mapping = new MappingResource(
 *     "Complex_Transform.mmap",
 *     undefined,
 *     "./mappings/Complex_Transform.mmap"
 * );
 * ```
 *
 * Package structure:
 * ```
 * IntegrationFlow.zip
 * └── src/main/resources/
 *     └── mapping/
 *         └── Order_to_Invoice.mmap
 * ```
 */
export class MappingResource implements Resource {

    public readonly type: string = "mapping";
    public readonly name: string;
    public readonly content?: string;
    public readonly filePath?: string;

    /**
     * Creates a new Message Mapping resource
     *
     * @param name - Mapping filename (e.g., "Order_to_Invoice.mmap")
     * @param content - Optional inline mapping content (XML)
     * @param filePath - Optional filesystem path to load mapping from
     *
     * Note: Provide either content OR filePath, not both.
     * If both are provided, content takes precedence.
     *
     * @example
     * ```typescript
     * // Inline minimal mapping
     * const mapping = new MappingResource(
     *     "simple.mmap",
     *     `<?xml version="1.0" encoding="UTF-8"?>
     * <mapping xmlns="http://www.sap.com/mapping" version="1.0">
     *     <source>Source</source>
     *     <target>Target</target>
     * </mapping>`
     * );
     *
     * // From file
     * const mapping = new MappingResource(
     *     "complex.mmap",
     *     undefined,
     *     "./mappings/complex.mmap"
     * );
     * ```
     */
    constructor(
        name: string,
        content?: string,
        filePath?: string
    ) {
        if (!name.endsWith('.mmap')) {
            throw new Error(`Message mapping name must end with .mmap: ${name}`);
        }

        if (!content && !filePath) {
            throw new Error(`MappingResource must have either content or filePath: ${name}`);
        }

        this.name = name;
        this.content = content;
        this.filePath = filePath;
    }

    /**
     * Gets the mapping content
     *
     * Returns inline content if available, otherwise reads from filePath.
     *
     * @returns Mapping content as string (XML)
     * @throws Error if filePath doesn't exist
     */
    public getContent(): string {
        if (this.content) {
            return this.content;
        }

        if (this.filePath) {
            const fs = require('fs');
            if (!fs.existsSync(this.filePath)) {
                throw new Error(`Message mapping file not found: ${this.filePath}`);
            }
            return fs.readFileSync(this.filePath, 'utf-8');
        }

        throw new Error(`MappingResource has no content or filePath: ${this.name}`);
    }

    /**
     * Gets the package path for this resource
     *
     * Returns the path where this resource should be placed in the ZIP bundle.
     *
     * @returns Package path (e.g., "src/main/resources/mapping/Order_to_Invoice.mmap")
     */
    public getPackagePath(): string {
        return `src/main/resources/mapping/${this.name}`;
    }

    /**
     * Gets the BPMN reference path
     *
     * Returns the path used to reference this resource from BPMN XML.
     *
     * @returns BPMN reference path (e.g., "mapping/Order_to_Invoice.mmap")
     */
    public getBpmnReference(): string {
        return `mapping/${this.name}`;
    }

    /**
     * Gets the mapping URI
     *
     * Returns the SAP-specific URI format for mappinguri property.
     *
     * @returns Mapping URI (e.g., "dir://mmap/src/main/resources/mapping/Order_to_Invoice.mmap")
     */
    public getMappingUri(): string {
        return `dir://mmap/${this.getPackagePath()}`;
    }

    /**
     * Gets the base mapping name (without .mmap extension)
     *
     * @returns Base name (e.g., "Order_to_Invoice")
     */
    public getBaseName(): string {
        return this.name.replace('.mmap', '');
    }
}
