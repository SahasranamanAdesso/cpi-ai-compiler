import { Component } from "./Component";

/**
 * XmlValidator - Validates XML message against XSD schema
 *
 * Validates incoming XML messages against an XSD schema to ensure structural correctness
 * before further processing. Can either throw exception on validation failure or continue
 * with validation errors stored in message headers.
 *
 * In SAP Integration Suite:
 * - BPMN element: <callActivity activityType="XmlValidator">
 * - Validates XML payload against specified XSD schema
 * - Schema can be from iFlow resources or message header
 * - Validation errors can trigger exception or be logged
 *
 * Architecture:
 * - Extends Component (same pattern as Content Modifier, Router, Groovy)
 * - XSD schema packaged using XsdResource class
 * - References schema by path: /xsd/SchemaName.xsd
 *
 * Example usage:
 * ```typescript
 * // Add XSD schema to flow
 * const schema = new XsdResource(
 *     "OrderSchema.xsd",
 *     `<?xml version="1.0"?>
 *      <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
 *          <xs:element name="Order">...</xs:element>
 *      </xs:schema>`
 * );
 * flow.addResource(schema);
 *
 * // Create validator referencing the schema
 * const validator = new XmlValidator(
 *     "Validate Order",
 *     "/xsd/OrderSchema.xsd"
 * );
 * flow.addComponent(validator);
 * ```
 *
 * SAP Evidence:
 * - BPMN: POC.iflw lines 756-789
 * - Component: activityType="XmlValidator"
 * - Version: 2.2, cmdVariantUri version 2.2.3
 */
export class XmlValidator extends Component {

    /**
     * Creates a new XML Validator component
     *
     * @param name - Display name for the validator (e.g., "Validate Order")
     * @param xsdPath - Path to XSD schema file (e.g., "/xsd/OrderSchema.xsd")
     * @param preventException - If false (default), validation failure throws exception.
     *                           If true, validation continues with errors in headers.
     * @param additionalProperties - Optional additional SAP properties
     * @param id - Optional component ID (auto-generated if not provided)
     *
     * Common properties:
     * - xmlSchemaSource: "iflowOption" (from resources) or "header" (from message header)
     * - headerSource: Header name containing XSD path (when xmlSchemaSource="header")
     */
    constructor(
        name: string,
        xsdPath: string,
        preventException: boolean = false,
        additionalProperties: Record<string, any> = {},
        id?: string
    ) {
        // Use provided ID or generate unique ID (same pattern as
        // ProcessCall/Router/GroovyScript -- see CP-001 fix history)
        const componentId = id || `XmlValidator_${Date.now()}`;

        const properties = {
            xmlSchemaSource: additionalProperties.xmlSchemaSource || "iflowOption",
            preventException: preventException.toString(),
            xsd: xsdPath,
            headerSource: additionalProperties.headerSource || "",
            ...additionalProperties
        };

        super(componentId, name, "XmlValidator", properties);
    }

    /**
     * Creates an XML Validator that reads schema from message header
     *
     * @param name - Display name
     * @param headerName - Header containing XSD path
     * @param preventException - Whether to prevent exception on validation failure
     * @returns XmlValidator instance configured for header-based schema
     */
    static fromHeader(
        name: string,
        headerName: string,
        preventException: boolean = false
    ): XmlValidator {
        return new XmlValidator(
            name,
            "", // xsdPath not used when source is header
            preventException,
            {
                xmlSchemaSource: "header",
                headerSource: headerName
            }
        );
    }
}
