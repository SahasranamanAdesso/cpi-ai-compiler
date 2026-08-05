import { Resource } from "./Resource";

/**
 * XsdResource - Represents an XSD schema artifact
 *
 * XSD (XML Schema Definition) files define message structures used by Message Mappings.
 * They are packaged in the Integration Flow bundle under the xsd/ directory.
 *
 * In SAP Integration Suite:
 * - Location: src/main/resources/xsd/{name}.xsd
 * - Referenced by: .mmap files for source and target structures
 * - Used by: Message Mapping component for transformation definitions
 *
 * Architecture:
 * - This class implements the generic Resource interface
 * - Content can be provided inline or loaded from filesystem
 * - Packager handles ZIP bundle integration
 *
 * Example usage:
 * ```typescript
 * // Define source schema
 * const sourceSchema = new XsdResource(
 *     "OrderSource.xsd",
 *     `<?xml version="1.0" encoding="UTF-8"?>
 * <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
 *     <xs:element name="Order">
 *         <xs:complexType>
 *             <xs:sequence>
 *                 <xs:element name="OrderID" type="xs:string"/>
 *             </xs:sequence>
 *         </xs:complexType>
 *     </xs:element>
 * </xs:schema>`
 * );
 * ```
 *
 * Package structure:
 * ```
 * IntegrationFlow.zip
 * └── src/main/resources/
 *     └── xsd/
 *         ├── OrderSource.xsd
 *         └── OrderTarget.xsd
 * ```
 */
export class XsdResource implements Resource {

    public readonly type: string = "xsd";
    public readonly name: string;
    public readonly content?: string;
    public readonly filePath?: string;

    /**
     * Creates a new XSD schema resource
     *
     * @param name - Schema filename (e.g., "OrderSource.xsd")
     * @param content - Optional inline schema content (XML)
     * @param filePath - Optional filesystem path to load schema from
     *
     * Note: Provide either content OR filePath, not both.
     * If both are provided, content takes precedence.
     */
    constructor(
        name: string,
        content?: string,
        filePath?: string
    ) {
        if (!name.endsWith('.xsd')) {
            throw new Error(`XSD schema name must end with .xsd: ${name}`);
        }

        if (!content && !filePath) {
            throw new Error(`XsdResource must have either content or filePath: ${name}`);
        }

        this.name = name;
        this.content = content;
        this.filePath = filePath;
    }

    /**
     * Gets the schema content
     *
     * Returns inline content if available, otherwise reads from filePath.
     *
     * @returns Schema content as string (XML)
     * @throws Error if filePath doesn't exist
     */
    public getContent(): string {
        if (this.content) {
            return this.content;
        }

        if (this.filePath) {
            const fs = require('fs');
            if (!fs.existsSync(this.filePath)) {
                throw new Error(`XSD schema file not found: ${this.filePath}`);
            }
            return fs.readFileSync(this.filePath, 'utf-8');
        }

        throw new Error(`XsdResource has no content or filePath: ${this.name}`);
    }

    /**
     * Gets the package path for this resource
     *
     * Returns the path where this resource should be placed in the ZIP bundle.
     *
     * @returns Package path (e.g., "src/main/resources/xsd/OrderSource.xsd")
     */
    public getPackagePath(): string {
        return `src/main/resources/xsd/${this.name}`;
    }

    /**
     * Gets the BPMN reference path
     *
     * Returns the path used to reference this resource from .mmap files.
     *
     * @returns BPMN reference path (e.g., "xsd/OrderSource.xsd")
     */
    public getBpmnReference(): string {
        return `xsd/${this.name}`;
    }

    /**
     * Gets the base schema name (without .xsd extension)
     *
     * @returns Base name (e.g., "OrderSource")
     */
    public getBaseName(): string {
        return this.name.replace('.xsd', '');
    }
}
