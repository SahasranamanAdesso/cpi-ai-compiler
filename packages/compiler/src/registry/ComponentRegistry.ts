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
     * Data Store
     * BPMN: <callActivity activityType="DBstorage">
     *
     * Evidence Sources:
     * - Agg Test.iflw lines 268-296 (Write/put operation - VERIFIED SAP EXPORT)
     * - ARR-2026-07-15.md lines 233-240 (properties documentation)
     *
     * SAP Data Store enables temporary message storage with operations:
     * - Write (put): Store message with entry ID
     * - Get: Retrieve message by entry ID
     * - Delete: Remove message by entry ID
     *
     * CRITICAL: cmdVariantUri uses OPERATION name (put/get/delete), not "DBStorage"
     * Evidence: Agg Test.iflw line 282: ctype::FlowstepVariant/cname::put/version::1.7.1
     *
     * Key properties (from SAP export):
     * - operation: "put" | "get" | "delete"
     * - storageName: Data store name
     * - entryId: Unique identifier (supports expressions) - NOT in Agg Test, but in ARR
     * - includeMessageHeaders: "true" | "false"
     * - visibility: "local" | "global"
     * - encrypt: "true" | "false"
     * - expire: TTL in days
     *
     * activityType: "DBstorage" (lowercase 's')
     * cmdVariantUri: DYNAMIC - ctype::FlowstepVariant/cname::{operation}/version::1.7.1
     * componentVersion: "1.7"
     */
    DBStorage: {
        displayName: "Data Store",
        bpmnElement: "callActivity",
        activityType: "DBstorage",  // Fixed: lowercase 's'
        metadata: {
            activityType: "DBstorage",  // Fixed: lowercase 's'
            cmdVariantUri: "ctype::FlowstepVariant/cname::put/version::1.7.1",  // Fixed: operation-specific
            componentVersion: "1.7",  // Fixed: correct version
            defaultProperties: {
                operation: "put",
                storageName: "",
                entryId: "",
                includeMessageHeaders: "true",
                visibility: "local",
                encrypt: "true",
                expire: "30",
                // Retention Threshold for Alerting (days). SAP rejects this as
                // empty at design-time if not set. Evidence: agg-test "Write 1"
                // step, <key>alert</key><value>2</value>
                alert: "2"
            }
        }
    },

    /**
     * Multicast (Parallel Gateway)
     * BPMN: <parallelGateway activityType="Multicast">
     *
     * Evidence Source:
     * - IPRO_SRM_MM_MAIN.iflw lines 1397-1421 (complete SAP export)
     *
     * SAP Multicast enables parallel message processing:
     * - Sends message to ALL connected receivers simultaneously
     * - No conditional logic (unlike Router/exclusiveGateway)
     * - Each branch processes independently in parallel
     *
     * Key metadata (from IPRO SAP export):
     * - activityType: "Multicast"
     * - subActivityType: "parallel"
     * - cmdVariantUri: ctype::FlowstepVariant/cname::Multicast/version::1.1.1
     * - componentVersion: "1.1"
     *
     * Use cases:
     * - Fan-out pattern (send to multiple systems)
     * - Parallel transformations
     * - Broadcast messages
     */
    Multicast: {
        displayName: "Multicast",
        bpmnElement: "parallelGateway",
        activityType: "Multicast",
        metadata: {
            activityType: "Multicast",
            subActivityType: "parallel",
            cmdVariantUri: "ctype::FlowstepVariant/cname::Multicast/version::1.1.1",
            componentVersion: "1.1",
            defaultProperties: {}
        }
    },

    /**
     * General Splitter
     * BPMN: <callActivity activityType="Splitter">
     *
     * Evidence Source:
     * - POC.iflw lines 1082-1135 (complete SAP export)
     *
     * SAP General Splitter splits a single message containing multiple items
     * into individual messages for parallel or sequential processing:
     * - XPath-based splitting for XML messages
     * - Token-based splitting for delimited formats
     * - Streaming support for large messages
     * - Configurable parallel processing with thread control
     *
     * Key metadata (from POC SAP export):
     * - activityType: "Splitter"
     * - splitType: "GeneralSplitter"
     * - cmdVariantUri: ctype::FlowstepVariant/cname::GeneralSplitter/version::1.6.0
     * - componentVersion: "1.6"
     *
     * Key properties:
     * - splitExprValue: XPath or token expression defining split points
     * - exprType: "XPath" | "Token"
     * - ParallelProcessing: "true" | "false"
     * - SplitterThreads: number of parallel threads (default: 10)
     * - Streaming: "true" | "false" (for large messages)
     * - StopOnExecution: "true" | "false"
     * - timeOut: timeout in seconds (default: 300)
     *
     * Use cases:
     * - Split bulk order file into individual orders
     * - Process array of items in parallel
     * - Fan-out pattern for distributing work
     */
    GeneralSplitter: {
        displayName: "General Splitter",
        bpmnElement: "callActivity",
        activityType: "Splitter",
        metadata: {
            activityType: "Splitter",
            cmdVariantUri: "ctype::FlowstepVariant/cname::GeneralSplitter/version::1.6.0",
            componentVersion: "1.6",
            defaultProperties: {
                exprType: "XPath",
                splitExprValue: "",
                splitType: "GeneralSplitter",
                Streaming: "true",
                StopOnExecution: "true",
                SplitterThreads: "10",
                ParallelProcessing: "false",
                grouping: "",
                timeOut: "300"
            }
        }
    },

    /**
     * Gather (Aggregator)
     * BPMN: <callActivity activityType="Gather">
     *
     * Evidence Source:
     * - POC.iflw lines 1018-1055 (complete SAP export)
     *
     * SAP Gather aggregates multiple split messages back into a single message:
     * - Typically used after Splitter component
     * - Supports multiple aggregation algorithms
     * - Can preserve or merge message structures
     * - Correlation-based message aggregation
     *
     * Key metadata (from POC SAP export):
     * - activityType: "Gather"
     * - cmdVariantUri: ctype::FlowstepVariant/cname::Gather/version::1.2.0
     * - componentVersion: "1.2"
     *
     * Key properties:
     * - aggregationAlgorithm: "sap-identical-multi-mapping" | "combine" | custom
     * - messageType: "SameXMLFormat" | "PlainText" | other
     * - targetXPath: Target XPath for aggregation
     * - sourceXPath: Source XPath for aggregation
     * - gatherFileNames: "true" | "false" | "" (optional)
     *
     * Use cases:
     * - Aggregate split orders back into bulk response
     * - Collect results from parallel processing
     * - Merge fan-out processing results
     */
    Gather: {
        displayName: "Gather",
        bpmnElement: "callActivity",
        activityType: "Gather",
        metadata: {
            activityType: "Gather",
            cmdVariantUri: "ctype::FlowstepVariant/cname::Gather/version::1.2.0",
            componentVersion: "1.2",
            defaultProperties: {
                aggregationAlgorithm: "sap-identical-multi-mapping",
                messageType: "SameXMLFormat",
                targetXPath: "",
                sourceXPath: "",
                gatherFileNames: ""
            }
        }
    },

    /**
     * Message Mapping
     * BPMN: <callActivity activityType="Mapping">
     *
     * Evidence Source:
     * - POC.iflw lines 1136-1181 (complete SAP export)
     *
     * SAP Message Mapping transforms message structures using graphical mapping definitions:
     * - References external .mmap file in mapping/ directory
     * - Supports XSLT, Java, and graphical transformations
     * - Can map between different message formats (XML, JSON, etc.)
     * - Supports static or dynamic mapping selection
     *
     * Key metadata (from POC SAP export):
     * - activityType: "Mapping"
     * - cmdVariantUri: ctype::FlowstepVariant/cname::MessageMapping/version::1.3.1
     * - componentVersion: "1.3"
     *
     * Key properties:
     * - mappingType: "MessageMapping"
     * - mappingReference: "static" | "dynamic"
     * - mappingname: Base name of .mmap file (without extension)
     * - mappingpath: Path to mapping directory
     * - mappinguri: Full URI to .mmap file
     * - mappingSourceValue: Dynamic mapping expression (if dynamic)
     * - messageMappingBundleId: Bundle ID (optional)
     *
     * Use cases:
     * - Transform SAP IDoc to REST JSON
     * - Convert order XML to invoice XML
     * - Map between different XSD schemas
     */
    MessageMapping: {
        displayName: "Message Mapping",
        bpmnElement: "callActivity",
        activityType: "Mapping",
        metadata: {
            activityType: "Mapping",
            cmdVariantUri: "ctype::FlowstepVariant/cname::MessageMapping/version::1.3.1",
            componentVersion: "1.3",
            defaultProperties: {
                mappingType: "MessageMapping",
                mappingReference: "static",
                mappingname: "",
                mappingpath: "src/main/resources/mapping/",
                mappinguri: "",
                mappingSourceValue: "",
                messageMappingBundleId: ""
            },
            resourceType: "mapping",
            resourceReference: "mapping/{name}.mmap"
        }
    },

    /**
     * XML Validator
     * BPMN: <callActivity activityType="XmlValidator">
     *
     * Evidence Source:
     * - POC.iflw lines 756-789 (complete SAP export)
     *
     * SAP XML Validator validates incoming XML messages against XSD schema:
     * - Validates message structure and data types
     * - Schema from iFlow resources or message header
     * - Can throw exception or continue with validation errors in headers
     * - Useful for ensuring data quality before processing
     *
     * Key metadata (from POC SAP export):
     * - activityType: "XmlValidator"
     * - cmdVariantUri: ctype::FlowstepVariant/cname::XmlValidator/version::2.2.3
     * - componentVersion: "2.2"
     *
     * Key properties:
     * - xmlSchemaSource: "iflowOption" (from resources) | "header" (from message header)
     * - preventException: "true" | "false" (if true, validation continues with errors in headers)
     * - xsd: Path to XSD schema file (e.g., "/xsd/OrderSchema.xsd")
     * - headerSource: Header name containing XSD path (when xmlSchemaSource="header")
     *
     * Use cases:
     * - Validate incoming orders against business schema
     * - Ensure data quality before expensive transformations
     * - Reject malformed messages early in integration flow
     */
    XmlValidator: {
        displayName: "XML Validator",
        bpmnElement: "callActivity",
        activityType: "XmlValidator",
        metadata: {
            activityType: "XmlValidator",
            cmdVariantUri: "ctype::FlowstepVariant/cname::XmlValidator/version::2.2.3",
            componentVersion: "2.2",
            defaultProperties: {
                xmlSchemaSource: "iflowOption",
                preventException: "false",
                xsd: "",
                headerSource: ""
            }
        }
    },

    /**
     * XSLT Mapping
     * BPMN: <callActivity activityType="Mapping" subActivityType="XSLTMapping">
     *
     * Evidence Source:
     * - POC2.iflw lines 756-801 (complete SAP export)
     * - XSLTMapping1.xsl (real XSLT file from POC2)
     *
     * SAP XSLT Mapping transforms XML using XSLT stylesheets:
     * - References external .xsl file in mapping/ directory
     * - Standard XSLT 1.0/2.0 transformation
     * - Can read mapping from iFlow or message header
     * - Output format: Bytes or String
     *
     * Key metadata (from POC2 SAP export):
     * - activityType: "Mapping"
     * - subActivityType: "XSLTMapping"
     * - cmdVariantUri: ctype::FlowstepVariant/cname::XSLTMapping/version::1.2.0
     * - componentVersion: "1.2"
     *
     * Key properties:
     * - mappingoutputformat: "Bytes" | "String"
     * - mappinguri: URI to .xsl file (dir://mapping/xslt/src/main/resources/mapping/{name}.xsl)
     * - mappingname: Name of mapping (without .xsl extension)
     * - mappingpath: Path to mapping directory
     * - mappingSource: "mappingSrcIflow" | "mappingSrcHeader"
     * - mappingHeaderNameKey: Header name (when mappingSource="mappingSrcHeader")
     *
     * Use cases:
     * - Transform XML message structure
     * - Convert between XML formats using standard XSLT
     * - Apply business logic transformations
     */
    XSLTMapping: {
        displayName: "XSLT Mapping",
        bpmnElement: "callActivity",
        activityType: "Mapping",
        metadata: {
            activityType: "Mapping",
            subActivityType: "XSLTMapping",
            cmdVariantUri: "ctype::FlowstepVariant/cname::XSLTMapping/version::1.2.0",
            componentVersion: "1.2",
            defaultProperties: {
                mappingoutputformat: "Bytes",
                mappinguri: "",
                mappingname: "",
                mappingpath: "src/main/resources/mapping/",
                mappingSource: "mappingSrcIflow",
                mappingHeaderNameKey: ""
            },
            resourceType: "xslt",
            resourceReference: "mapping/{name}.xsl"
        }
    },

    /**
     * Process Call (Non-Looping)
     * BPMN: <callActivity activityType="ProcessCallElement" subActivityType="NonLoopingProcess">
     *
     * Evidence Source:
     * - POC.iflw lines 1058-1081 (complete SAP export)
     *
     * SAP Process Call invokes a Local Integration Process (subprocess):
     * - Calls another integration process within same iFlow
     * - Enables modular, reusable integration logic
     * - Non-looping variant executes once
     * - Looping variant can iterate over message splits
     *
     * Key metadata (from POC SAP export):
     * - activityType: "ProcessCallElement"
     * - subActivityType: "NonLoopingProcess" | "LoopingProcess"
     * - cmdVariantUri: ctype::FlowstepVariant/cname::NonLoopingProcess/version::1.0.4
     * - componentVersion: "1.0"
     *
     * Key properties:
     * - processId: ID of Local Integration Process to call
     *
     * Use cases:
     * - Reusable data lookup subprocess
     * - Error handling routines
     * - Common transformation logic
     */
    ProcessCall: {
        displayName: "Process Call",
        bpmnElement: "callActivity",
        activityType: "ProcessCallElement",
        metadata: {
            activityType: "ProcessCallElement",
            subActivityType: "NonLoopingProcess",
            cmdVariantUri: "ctype::FlowstepVariant/cname::NonLoopingProcess/version::1.0.4",
            componentVersion: "1.0",
            defaultProperties: {
                processId: ""
            }
        }
    },

    /**
     * JDBC Call (mid-flow request-reply database call)
     * BPMN: <serviceTask activityType="ExternalCall">
     *
     * Evidence Source:
     * - "Send Inbound Normal Orders from OCE to S4HANA.iflw", ServiceTask_8
     *   "RR_OCEDB" (see model/JdbcCall.ts and model/JdbcAdapter.ts for the
     *   full evidence trail, including the paired JDBC messageFlow)
     *
     * The step itself carries no adapter configuration -- that lives on the
     * JDBC messageFlow that BpmnProcessMapper generates alongside it (see
     * JdbcCall.adapter). Only activityType/cmdVariantUri/componentVersion
     * are required on the serviceTask, exactly matching the SAP export.
     */
    JdbcCall: {
        displayName: "JDBC Call",
        bpmnElement: "serviceTask",
        activityType: "ExternalCall",
        metadata: {
            activityType: "ExternalCall",
            cmdVariantUri: "ctype::FlowstepVariant/cname::ExternalCall/version::1.0.4",
            componentVersion: "1.0",
            defaultProperties: {}
        }
    }

};
