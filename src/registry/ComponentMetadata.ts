/**
 * ComponentMetadata - Complete metadata for CallActivity-based components
 *
 * Describes ALL information needed to generate a processing component
 * without hardcoding in writers.
 *
 * This metadata structure enables the compiler to generate CallActivity elements
 * for different SAP component types (Content Modifier, Router, Groovy Script, etc.)
 * without duplicating XML generation logic.
 *
 * Why this exists:
 * - Eliminates hardcoded component knowledge from writers
 * - Single metadata entry = complete component definition
 * - Adding new components requires no code changes
 *
 * Example:
 *   Content Modifier metadata:
 *   {
 *     activityType: "Enricher",
 *     cmdVariantUri: "ctype::FlowstepVariant/cname::Enricher/version::1.6.3",
 *     componentVersion: "1.6",
 *     defaultProperties: {
 *       bodyType: "constant",
 *       propertyTable: "",
 *       headerTable: "",
 *       wrapContent: ""
 *     }
 *   }
 */
export interface ComponentMetadata {
    /**
     * SAP activity type identifier
     *
     * This determines the component's runtime behavior in SAP Integration Suite.
     * Each SAP processing component has a unique activityType.
     *
     * Examples:
     * - "Enricher" — Content Modifier
     * - "Router" — Message Router
     * - "ScriptCollection" — Groovy Script
     * - "DBStorage" — Data Store Write
     */
    activityType: string;

    /**
     * Operation name (optional)
     *
     * Some components use an operation field instead of or in addition to activityType.
     * This field captures component-specific operation semantics.
     *
     * Examples:
     * - "Route" — For Router components
     * - "Execute" — For Script components
     * - "Write" — For Data Store components
     */
    operation?: string;

    /**
     * Command variant URI for SAP Integration Suite
     *
     * This URI identifies the specific SAP component variant and version.
     * It follows the SAP-specific format:
     *   ctype::FlowstepVariant/cname::<ComponentName>/version::<Version>
     *
     * Examples:
     * - "ctype::FlowstepVariant/cname::Enricher/version::1.6.3"
     * - "ctype::FlowstepVariant/cname::Router/version::1.0.0"
     * - "ctype::FlowstepVariant/cname::ScriptCollection/version::1.2.0"
     *
     * This is a required SAP extension property for CallActivity elements.
     */
    cmdVariantUri: string;

    /**
     * Component version
     *
     * SAP component version number (e.g., "1.6", "1.2", "1.0").
     * This is a required SAP extension property.
     *
     * Different components may have different version schemes:
     * - Content Modifier: "1.6"
     * - Router: "1.0"
     * - Groovy Script: "1.2"
     */
    componentVersion: string;

    /**
     * Default configuration properties
     *
     * Key-value pairs representing the default configuration for this component type.
     * These are merged with user-provided properties (user properties take precedence).
     *
     * Examples:
     *
     * Content Modifier defaults:
     * {
     *   bodyType: "constant",
     *   propertyTable: "",
     *   headerTable: "",
     *   wrapContent: ""
     * }
     *
     * Router defaults:
     * {
     *   routingCondition: "",
     *   defaultRoute: "true"
     * }
     *
     * These ensure all required SAP properties are present even if the user
     * doesn't explicitly provide them.
     */
    defaultProperties?: Record<string, string>;

    /**
     * Resource type if this component uses external resources
     *
     * Identifies the type of external artifact this component references.
     *
     * Examples:
     * - "groovy" — Groovy Script component
     * - "mapping" — Message Mapping component
     * - "xsd" — Schema Validator component
     * - "xslt" — XSLT Transform component
     *
     * Components without external resources (Content Modifier, Router) leave this undefined.
     */
    resourceType?: string;

    /**
     * Resource reference pattern (optional)
     *
     * Template string for how this component references its resource in the BPMN.
     *
     * Examples:
     * - "script/{name}.groovy" — Groovy scripts
     * - "mapping/{name}.mmap" — Message mappings
     * - "schema/{name}.xsd" — XSD schemas
     *
     * The {name} placeholder is replaced with the actual resource identifier.
     *
     * Note: Resource packaging is not yet implemented (Version 1.2.1+).
     * This field prepares the metadata structure for future use.
     */
    resourceReference?: string;
}
