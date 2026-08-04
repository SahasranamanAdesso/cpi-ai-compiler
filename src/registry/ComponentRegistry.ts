/**
 * ComponentRegistry - SAP CPI Component Metadata
 *
 * This is the SINGLE SOURCE OF TRUTH for how CPI components map to BPMN.
 *
 * Why this exists:
 * - Separates SAP-specific knowledge from compiler logic
 * - Metadata-driven: adding new components = adding entries here
 * - No hardcoded if/switch statements in the compiler
 *
 * Structure:
 * - Key: SAP technical name (matches .iflw exports)
 * - displayName: Friendly name for developers
 * - bpmnElement: The BPMN element type to generate
 * - activityType: SAP-specific activity type (for callActivity)
 *
 * Example:
 *   ComponentRegistry.Enricher
 *   → {
 *       displayName: "Content Modifier",
 *       bpmnElement: "callActivity",
 *       activityType: "Enricher"
 *     }
 *
 * This drives the compiler transformation:
 *   Component("Content Modifier")
 *       ↓
 *   Registry lookup
 *       ↓
 *   callActivity with activityType="Enricher"
 */

import { ComponentMetadata } from "./ComponentMetadata";

/**
 * ComponentDefinition - Metadata for a single CPI component
 */
export interface ComponentDefinition {
    /**
     * Friendly name shown to developers
     * Example: "Content Modifier", "HTTPS Adapter"
     */
    displayName: string;

    /**
     * BPMN element type to generate
     * Example: "callActivity", "participant", "exclusiveGateway"
     */
    bpmnElement: string;

    /**
     * SAP-specific activity type (for callActivity elements)
     * Example: "Enricher", "Router", "ScriptCollection"
     */
    activityType?: string;

    /**
     * Complete metadata for CallActivity-based components
     *
     * Contains all information needed to generate the component without
     * hardcoding in writers: cmdVariantUri, componentVersion, default properties,
     * and optional resource references.
     *
     * Only present for CallActivity-based processing components.
     * Adapters (participant elements) do not have this metadata.
     */
    metadata?: ComponentMetadata;
}

/**
 * ComponentRegistry - Map of all supported CPI components
 *
 * Key: SAP technical name (stable identifier used in .iflw)
 * Value: ComponentDefinition with BPMN mapping metadata
 */
export const ComponentRegistry: Record<string, ComponentDefinition> = {

    /**
     * Content Modifier
     * BPMN: <callActivity activityType="Enricher">
     */
    Enricher: {
        displayName: "Content Modifier",
        bpmnElement: "callActivity",
        activityType: "Enricher",
        metadata: {
            activityType: "Enricher",
            cmdVariantUri: "ctype::FlowstepVariant/cname::Enricher/version::1.6.3",
            componentVersion: "1.6",
            defaultProperties: {
                bodyType: "constant",
                propertyTable: "",
                headerTable: "",
                wrapContent: ""
            }
        }
    },

    /**
     * HTTPS Adapter (Sender/Receiver)
     * BPMN: <participant>
     */
    HTTPS: {
        displayName: "HTTPS Adapter",
        bpmnElement: "participant"
    },

    /**
     * Router
     * BPMN: <exclusiveGateway>
     *
     * SAP-compatible metadata verified against IPRO_PRODUCT_HTTP export
     * Evidence: lines 932-955 in IPRO_PRODUCT_HTTP.iflw
     *
     * CORRECTION: Previous assumption that gateways don't use SAP metadata was WRONG.
     * SAP Integration Suite requires extension elements even for gateways.
     *
     * Key properties (all required):
     * - activityType: "ExclusiveGateway" (SAP line 939-941)
     * - cmdVariantUri: ctype::FlowstepVariant/cname::ExclusiveGateway/version::1.1.2 (SAP line 943-945)
     * - componentVersion: "1.1" (SAP line 935-937)
     * - throwException: "false" (SAP line 947-949)
     * - default attribute: Specifies default route ID (SAP line 932)
     */
    Router: {
        displayName: "Router",
        bpmnElement: "exclusiveGateway",
        activityType: "ExclusiveGateway",
        metadata: {
            activityType: "ExclusiveGateway",
            cmdVariantUri: "ctype::FlowstepVariant/cname::ExclusiveGateway/version::1.1.2",
            componentVersion: "1.1",
            defaultProperties: {
                throwException: "false"
            }
        }
    },

    /**
     * Groovy Script
     * BPMN: <callActivity activityType="Script">
     *
     * SAP-compatible metadata verified against IPRO_PRODUCT_HTTP export
     * Evidence: lines 712-745 in IPRO_PRODUCT_HTTP.iflw
     *
     * Key properties (all required):
     * - activityType: "Script" (NOT "ScriptCollection")
     * - cmdVariantUri: cname::GroovyScript/version::1.1.2
     * - componentVersion: "1.1" (NOT "1.2")
     * - subActivityType: "GroovyScript"
     * - script: resource path (NOT "scriptReference")
     * - scriptFunction: empty value (required by SAP)
     * - scriptBundleId: empty value (required by SAP)
     */
    ScriptCollection: {
        displayName: "Groovy Script",
        bpmnElement: "callActivity",
        activityType: "Script",
        metadata: {
            activityType: "Script",
            cmdVariantUri: "ctype::FlowstepVariant/cname::GroovyScript/version::1.1.2",
            componentVersion: "1.1",
            subActivityType: "GroovyScript",
            scriptFunction: "",
            scriptBundleId: "",
            resourceType: "groovy",
            resourceReference: "script/{name}.groovy"
        }
    },

    /**
     * Data Store Write
     * BPMN: <callActivity activityType="DBStorage">
     *
     * Note: Implementation pending (Version 1.2.1+)
     * Metadata structure prepared for future use
     */
    DBStorage: {
        displayName: "Data Store",
        bpmnElement: "callActivity",
        activityType: "DBStorage",
        metadata: {
            activityType: "DBStorage",
            operation: "Write",
            cmdVariantUri: "ctype::FlowstepVariant/cname::DBStorage/version::1.0.0",
            componentVersion: "1.0"
        }
    }

};
