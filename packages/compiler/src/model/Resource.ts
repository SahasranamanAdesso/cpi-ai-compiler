/**
 * Resource - Abstract representation of external artifacts
 *
 * Resources are files referenced by SAP processing components that require
 * external artifacts to function:
 *
 * - Groovy Script (ScriptCollection) → .groovy files
 * - Message Mapping (MessageMapping) → .mmap files
 * - Schema Validator (SchemaValidator) → .xsd files
 * - XSLT Transform (XsltTransform) → .xslt files
 *
 * This is an abstraction layer that decouples the domain model (Component)
 * from the physical artifacts (files in the ZIP bundle).
 *
 * Future implementations will extend this interface for specific resource types:
 * - GroovyResource
 * - MappingResource
 * - XsdResource
 * - XsltResource
 *
 * Note: Resource packaging is NOT yet implemented (Version 1.2.1+).
 * This interface prepares the architecture for future resource support.
 *
 * Usage pattern (future):
 * ```typescript
 * // Groovy Script component with resource
 * const script = new Component("Script_1", "Transform", "ScriptCollection", {
 *   resourceReference: {
 *     type: "groovy",
 *     path: "script/transform.groovy"
 *   }
 * });
 *
 * // The resource itself
 * const groovyScript = new GroovyResource(
 *   "transform.groovy",
 *   "def message = messageLog.getMessageText()"
 * );
 * ```
 */
export interface Resource {
    /**
     * Resource type identifier
     *
     * Identifies the kind of resource this represents.
     *
     * Standard types:
     * - "groovy" — Groovy script
     * - "mapping" — Message mapping
     * - "xsd" — XML schema
     * - "xslt" — XSLT transformation
     * - "wsdl" — Web service definition
     *
     * Custom resource types can be added as needed.
     */
    type: string;

    /**
     * Resource name
     *
     * The filename of the resource (e.g., "transform.groovy", "mapping.mmap").
     * This is used to reference the resource from BPMN and to determine
     * the file path in the ZIP bundle.
     *
     * Examples:
     * - "transform.groovy"
     * - "CustomerMapping.mmap"
     * - "invoice.xsd"
     */
    name: string;

    /**
     * Optional inline content
     *
     * For small resources or resources generated at compile-time,
     * content can be provided directly as a string.
     *
     * Example:
     * ```typescript
     * {
     *   type: "groovy",
     *   name: "simple.groovy",
     *   content: "def body = message.getBody(String.class)"
     * }
     * ```
     *
     * Mutually exclusive with filePath (use one or the other, not both).
     */
    content?: string;

    /**
     * Optional file path
     *
     * For resources loaded from the filesystem, this is the path
     * to the source file.
     *
     * Example:
     * ```typescript
     * {
     *   type: "groovy",
     *   name: "transform.groovy",
     *   filePath: "./scripts/transform.groovy"
     * }
     * ```
     *
     * The packager will read this file and include it in the ZIP bundle
     * at the appropriate location (e.g., src/main/resources/script/transform.groovy).
     *
     * Mutually exclusive with content (use one or the other, not both).
     */
    filePath?: string;
}

/**
 * ResourceReference - Link from Component to Resource
 *
 * Used in Component.properties to reference external artifacts.
 *
 * This is a lightweight reference that gets embedded in the BPMN XML
 * as an ifl:property element. The actual Resource object is managed
 * separately and packaged by the Serializer/Packager.
 *
 * Example BPMN output:
 * ```xml
 * <bpmn2:callActivity id="Script_1" name="Transform">
 *   <bpmn2:extensionElements>
 *     <ifl:property>
 *       <key>activityType</key>
 *       <value>ScriptCollection</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>scriptReference</key>
 *       <value>script/transform.groovy</value>
 *     </ifl:property>
 *   </bpmn2:extensionElements>
 * </bpmn2:callActivity>
 * ```
 *
 * Usage:
 * ```typescript
 * const script = new Component("Script_1", "Transform", "ScriptCollection", {
 *   resourceReference: {
 *     type: "groovy",
 *     path: "script/transform.groovy"
 *   }
 * });
 * ```
 */
export interface ResourceReference {
    /**
     * Resource type
     *
     * Must match the Resource.type of the corresponding Resource object.
     *
     * Examples:
     * - "groovy"
     * - "mapping"
     * - "xsd"
     * - "xslt"
     */
    type: string;

    /**
     * Resource path
     *
     * The path to the resource within the ZIP bundle structure.
     * This follows SAP Integration Suite conventions:
     *
     * - Groovy scripts: "script/{name}.groovy"
     * - Message mappings: "mapping/{name}.mmap"
     * - XSD schemas: "schema/{name}.xsd"
     * - XSLT: "xslt/{name}.xslt"
     *
     * Examples:
     * - "script/transform.groovy"
     * - "mapping/CustomerMapping.mmap"
     * - "schema/invoice.xsd"
     */
    path: string;
}
