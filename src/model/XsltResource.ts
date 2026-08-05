import { Resource } from "./Resource";

/**
 * XsltResource - Represents an XSLT stylesheet artifact
 *
 * XSLT (Extensible Stylesheet Language Transformations) files define XML transformations
 * using standard XSLT 1.0/2.0 syntax. They are packaged in the Integration Flow bundle
 * under the mapping/ directory (same location as .mmap files).
 *
 * In SAP Integration Suite:
 * - Location: src/main/resources/mapping/{name}.xsl
 * - Referenced by: XSLT Mapping component
 * - Used for: XML structure transformations using standard XSLT
 *
 * Architecture:
 * - This class implements the generic Resource interface
 * - Content can be provided inline or loaded from filesystem
 * - Packager handles ZIP bundle integration (mapping/ directory)
 *
 * Example usage:
 * ```typescript
 * // Define XSLT transformation
 * const xslt = new XsltResource(
 *     "OrderToInvoice.xsl",
 *     `<?xml version="1.0" encoding="UTF-8"?>
 * <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
 *     <xsl:template match="/">
 *         <Invoice>
 *             <InvoiceID><xsl:value-of select="Order/OrderID"/></InvoiceID>
 *             <CustomerID><xsl:value-of select="Order/Customer"/></CustomerID>
 *             <Amount><xsl:value-of select="Order/TotalAmount"/></Amount>
 *         </Invoice>
 *     </xsl:template>
 * </xsl:stylesheet>`
 * );
 * flow.addResource(xslt);
 * ```
 *
 * Package structure:
 * ```
 * IntegrationFlow.zip
 * └── src/main/resources/
 *     └── mapping/
 *         ├── OrderToInvoice.xsl
 *         └── ProductMapping.xsl
 * ```
 *
 * Evidence:
 * - POC2.iflw lines 756-801 (XSLT Mapping component)
 * - POC2: src/main/resources/mapping/XSLTMapping1.xsl (real XSLT file)
 */
export class XsltResource implements Resource {

    public readonly type: string = "xslt";
    public readonly name: string;
    public readonly content?: string;
    public readonly filePath?: string;

    /**
     * Creates a new XSLT stylesheet resource
     *
     * @param name - Stylesheet filename (e.g., "OrderToInvoice.xsl")
     * @param content - Optional inline XSLT content (XML)
     * @param filePath - Optional filesystem path to load stylesheet from
     *
     * Note: Provide either content OR filePath, not both.
     * If both are provided, content takes precedence.
     */
    constructor(
        name: string,
        content?: string,
        filePath?: string
    ) {
        if (!name.endsWith('.xsl') && !name.endsWith('.xslt')) {
            throw new Error(`XSLT stylesheet name must end with .xsl or .xslt: ${name}`);
        }

        if (!content && !filePath) {
            throw new Error(`XsltResource must have either content or filePath: ${name}`);
        }

        this.name = name;
        this.content = content;
        this.filePath = filePath;
    }

    /**
     * Gets the stylesheet content
     *
     * Returns inline content if available, otherwise reads from filePath.
     *
     * @returns Stylesheet content as string (XML)
     * @throws Error if filePath doesn't exist
     */
    public getContent(): string {
        if (this.content) {
            return this.content;
        }

        if (this.filePath) {
            const fs = require('fs');
            if (!fs.existsSync(this.filePath)) {
                throw new Error(`XSLT stylesheet file not found: ${this.filePath}`);
            }
            return fs.readFileSync(this.filePath, 'utf-8');
        }

        throw new Error(`XsltResource has no content or filePath: ${this.name}`);
    }

    /**
     * Gets the package path for this resource
     *
     * Returns the path where this resource should be placed in the ZIP bundle.
     * XSLT files are stored in the same mapping/ directory as .mmap files.
     *
     * @returns Package path (e.g., "src/main/resources/mapping/OrderToInvoice.xsl")
     */
    public getPackagePath(): string {
        return `src/main/resources/mapping/${this.name}`;
    }

    /**
     * Gets the BPMN reference URI
     *
     * Returns the URI used to reference this resource from XSLT Mapping components.
     *
     * @returns BPMN reference URI (e.g., "dir://mapping/xslt/src/main/resources/mapping/OrderToInvoice.xsl")
     */
    public getMappingUri(): string {
        return `dir://mapping/xslt/src/main/resources/mapping/${this.name}`;
    }

    /**
     * Gets the base mapping name (without .xsl/.xslt extension)
     *
     * @returns Base name (e.g., "OrderToInvoice")
     */
    public getBaseName(): string {
        return this.name.replace(/\.(xsl|xslt)$/, '');
    }
}
