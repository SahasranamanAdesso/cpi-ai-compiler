import { Component } from "./Component";

/**
 * XsltMapping - XSLT transformation component
 *
 * Transforms XML messages using XSLT stylesheets. Supports standard XSLT 1.0/2.0
 * transformations with external .xsl files packaged in the integration flow.
 *
 * In SAP Integration Suite:
 * - BPMN element: <callActivity activityType="Mapping" subActivityType="XSLTMapping">
 * - Transforms XML using XSLT stylesheet
 * - Stylesheet from iFlow resources or message header
 * - Output format: Bytes (for binary) or String (for text)
 *
 * Architecture:
 * - Extends Component (same pattern as MessageMapping, Content Modifier)
 * - XSLT stylesheet packaged using XsltResource class
 * - References stylesheet by name (packaged in mapping/ directory)
 *
 * Example usage:
 * ```typescript
 * // Add XSLT stylesheet to flow
 * const xslt = new XsltResource(
 *     "OrderToInvoice.xsl",
 *     `<?xml version="1.0"?>
 *      <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
 *          <xsl:template match="/">
 *              <Invoice>...</Invoice>
 *          </xsl:template>
 *      </xsl:stylesheet>`
 * );
 * flow.addResource(xslt);
 *
 * // Create XSLT mapping referencing the stylesheet
 * const mapping = new XsltMapping(
 *     "Transform to Invoice",
 *     "OrderToInvoice.xsl"
 * );
 * flow.addComponent(mapping);
 * ```
 *
 * SAP Evidence:
 * - BPMN: POC2.iflw lines 756-801
 * - Stylesheet: POC2 src/main/resources/mapping/XSLTMapping1.xsl
 * - Component: activityType="Mapping", subActivityType="XSLTMapping"
 * - Version: 1.2, cmdVariantUri version 1.2.0
 */
export class XsltMapping extends Component {

    /**
     * Creates a new XSLT Mapping component
     *
     * @param name - Display name for the mapping (e.g., "Transform to Invoice")
     * @param stylesheetName - XSLT stylesheet filename (e.g., "OrderToInvoice.xsl")
     * @param outputFormat - Output format: "Bytes" (default, for binary) or "String" (for text)
     * @param additionalProperties - Optional additional SAP properties
     *
     * Common properties:
     * - mappingSource: "mappingSrcIflow" (from resources) or "mappingSrcHeader" (from header)
     * - mappingHeaderNameKey: Header name containing stylesheet path (when mappingSource="mappingSrcHeader")
     */
    constructor(
        name: string,
        stylesheetName: string,
        outputFormat: "Bytes" | "String" = "Bytes",
        additionalProperties: Record<string, any> = {}
    ) {
        const id = `XsltMapping_${Date.now()}`;

        // Normalize stylesheet name (add .xsl if not present)
        const normalizedName = stylesheetName.endsWith('.xsl') || stylesheetName.endsWith('.xslt')
            ? stylesheetName
            : `${stylesheetName}.xsl`;

        const baseName = normalizedName.replace(/\.(xsl|xslt)$/, '');

        const properties = {
            mappingoutputformat: outputFormat,
            mappinguri: `dir://mapping/xslt/src/main/resources/mapping/${normalizedName}`,
            mappingname: baseName,
            mappingpath: `src/main/resources/mapping/${baseName}`,
            mappingSource: additionalProperties.mappingSource || "mappingSrcIflow",
            mappingHeaderNameKey: additionalProperties.mappingHeaderNameKey || "",
            ...additionalProperties
        };

        super(id, name, "XSLTMapping", properties);
    }

    /**
     * Creates an XSLT Mapping that reads stylesheet from message header
     *
     * @param name - Display name
     * @param headerName - Header containing stylesheet path
     * @param outputFormat - Output format (Bytes or String)
     * @returns XsltMapping instance configured for header-based stylesheet
     */
    static fromHeader(
        name: string,
        headerName: string,
        outputFormat: "Bytes" | "String" = "Bytes"
    ): XsltMapping {
        return new XsltMapping(
            name,
            "", // stylesheetName not used when source is header
            outputFormat,
            {
                mappingSource: "mappingSrcHeader",
                mappingHeaderNameKey: headerName,
                mappinguri: "",
                mappingname: "",
                mappingpath: ""
            }
        );
    }
}
