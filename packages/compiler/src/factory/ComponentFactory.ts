/**
 * ComponentFactory - Generic factory layer for creating components from AI JSON
 *
 * This module provides a generic public API for creating IFlow components
 * from AI-generated JSON without requiring component-specific knowledge in CAP.
 *
 * Architecture:
 * - Reuses existing SDK classes (Component, HttpAdapter, Router, etc.)
 * - Uses ComponentRegistry for metadata-driven creation
 * - Validates inputs and provides clear error messages
 * - Preserves all existing APIs and behavior
 *
 * Public APIs:
 * - createComponent(type, config): Create processing components
 * - createAdapter(type, direction, config): Create sender/receiver adapters
 * - fromJson(json): Create complete IFlow from AI JSON
 */

import { IFlow } from '../model/IFlow';
import { Component } from '../model/Component';
import { HttpAdapter } from '../model/HttpAdapter';
import { ODataAdapter } from '../model/ODataAdapter';
import { SftpAdapter } from '../model/SftpAdapter';
import { SoapAdapter } from '../model/SoapAdapter';
import { IdocAdapter } from '../model/IdocAdapter';
import { JdbcAdapter } from '../model/JdbcAdapter';
import { JdbcCall } from '../model/JdbcCall';
import { ProcessDirectAdapter } from '../model/ProcessDirectAdapter';
import { ProcessDirectCall } from '../model/ProcessDirectCall';
import { RfcAdapter } from '../model/RfcAdapter';
import { JmsAdapter } from '../model/JmsAdapter';
import { Router } from '../model/Router';
import { GroovyScript } from '../model/GroovyScript';
import { DataStore } from '../model/DataStore';
import { Multicast } from '../model/Multicast';
import { Splitter } from '../model/Splitter';
import { Gather } from '../model/Gather';
import { MessageMapping } from '../model/MessageMapping';
import { XmlValidator } from '../model/XmlValidator';
import { XsltMapping } from '../model/XsltMapping';
import { ProcessCall } from '../model/ProcessCall';
import { LocalIntegrationProcess } from '../model/LocalIntegrationProcess';
import { ExceptionSubprocess } from '../model/ExceptionSubprocess';
import { GroovyResource } from '../model/GroovyResource';
import { MappingResource } from '../model/MappingResource';
import { XsdResource } from '../model/XsdResource';
import { XsltResource } from '../model/XsltResource';
import { ComponentRegistry } from '../registry/ComponentRegistry';
import { IdGenerator } from '../utils/IdGenerator';
import { toXmlTechnicalName, ensureUniqueTechnicalName } from '../utils/XmlName';

/**
 * Normalizes Markdown URLs to plain URLs
 * Converts [https://example.com](https://example.com) → https://example.com
 * Also handles escaped variants
 */
function normalizeUrl(value: any): any {
    if (typeof value !== 'string') {
        return value;
    }

    // Match Markdown URL pattern: [url](url)
    // Also handles escaped characters like \[ \] \(  \)
    const markdownUrlPattern = /^\\?\[([^\]]+)\\?\]\\?\(\\?(\1)\\?\)$/;
    const match = value.match(markdownUrlPattern);

    if (match) {
        return match[1]; // Return the URL without Markdown formatting
    }

    return value;
}

/**
 * Normalizes an XSD schema reference for XmlValidator.
 *
 * SAP packages XSD resources at src/main/resources/xsd/{name}.xsd and expects
 * the XmlValidator's "xsd" property to reference them as "/xsd/{name}.xsd"
 * (evidence: POC.iflw XmlValidator step, <key>xsd</key><value>/xsd/ProductTarget.xsd</value>).
 * AI-generated JSON frequently supplies just the bare filename (e.g.
 * "CustomerSchema.xsd"), which SAP cannot resolve at runtime ("schema does
 * not exist"), even though the resource itself is packaged correctly.
 * This does not apply when xmlSchemaSource is "header" -- there, "xsd" is
 * unused (the schema path comes from a message header instead).
 */
function normalizeXsdPath(xsd: string, xmlSchemaSource: unknown): string {
    if (xmlSchemaSource === 'header') {
        return xsd;
    }
    if (!xsd || xsd.startsWith('/') || /^https?:\/\//i.test(xsd)) {
        return xsd;
    }
    return `/xsd/${xsd}`;
}

/**
 * SAP Content Modifier ("Enricher") body-modification-type values seen in
 * real exports: "constant" (OrderProcessingWithJDBC.json;
 * ComponentRegistry.Enricher.metadata.defaultProperties) and "expression"
 * (process_direct_reference.zip, CallActivity_53 "Set Error Details" inside
 * the Local Integration Process). Both are lowercase in every real export --
 * SAP is case-sensitive here, so a value like "Expression" is silently
 * accepted by this compiler today but produces a Content Modifier step SAP
 * treats as unconfigured (shown with its generic palette description,
 * "Modifies incoming message with additional information", instead of
 * actually running). No other bodyType value has been observed in any
 * export in this repo, so anything else is rejected rather than guessed.
 */
const CONTENT_MODIFIER_BODY_TYPES = ['constant', 'expression'];

/**
 * Validates and normalizes a ContentModifier ("Enricher") config's
 * properties against the real, evidence-backed schema
 * (ComponentRegistry.Enricher.metadata.defaultProperties: bodyType,
 * wrapContent, propertyTable, headerTable -- see ComponentRegistry.ts).
 *
 * This does NOT invent new properties or reject properties beyond this set
 * (ComponentMapper already merges in registry defaults for anything left
 * unset, and passes through anything else the caller supplies). It exists
 * because ComponentFactory previously passed every property straight
 * through with zero validation, which let a wrong-typed or wrong-cased
 * value silently reach the generated .iflw and produce a Content Modifier
 * step that does nothing (root cause of the reported "Prepare Order Data"
 * bug: `bodyType: "Expression"` (wrong case) + `wrapContent: false` (wrong
 * type -- serialized as the literal string "false", not real content)).
 *
 * @throws if bodyType is present but isn't "constant"/"expression"
 *         (case-insensitively); if wrapContent/propertyTable/headerTable
 *         are present but not strings.
 */
function validateContentModifierProperties(properties: Record<string, any>): Record<string, any> {
    const validated = { ...properties };

    if (validated.bodyType !== undefined) {
        const normalized = String(validated.bodyType).toLowerCase();
        if (!CONTENT_MODIFIER_BODY_TYPES.includes(normalized)) {
            throw new Error(
                `Invalid ContentModifier bodyType: ${JSON.stringify(validated.bodyType)}. ` +
                `Supported values: ${CONTENT_MODIFIER_BODY_TYPES.join(', ')}.`
            );
        }
        validated.bodyType = normalized;
    }

    for (const key of ['wrapContent', 'propertyTable', 'headerTable']) {
        if (validated[key] !== undefined && typeof validated[key] !== 'string') {
            throw new Error(
                `ContentModifier property "${key}" must be a string (got ${typeof validated[key]}: ${JSON.stringify(validated[key])}). ` +
                `${key === 'wrapContent' ? 'It holds the actual message body content/expression, not a flag.' : 'It holds SAP\'s "<row>...</row>"-encoded table markup, not a flag.'}`
            );
        }
    }

    return validated;
}

/**
 * Normalizes all string values in a config object
 */
function normalizeConfig(config: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
        normalized[key] = normalizeUrl(value);
    }

    return normalized;
}

/**
 * Supported component types
 */
export type ComponentType =
    | 'ContentModifier'
    | 'Router'
    | 'GroovyScript'
    | 'DataStore'
    | 'Multicast'
    | 'Splitter'
    | 'Gather'
    | 'MessageMapping'
    | 'XmlValidator'
    | 'XsltMapping'
    | 'ProcessCall'
    | 'JdbcCall'
    | 'ProcessDirectCall'
    | 'RFC'
    | 'JMS';

/**
 * Supported adapter types
 */
export type AdapterType =
    | 'HTTP'
    | 'HTTPS'
    | 'OData'
    | 'SFTP'
    | 'SOAP'
    | 'IDoc'
    | 'JDBC'
    | 'ProcessDirect'
    | 'RFC'
    | 'JMS';

/**
 * Adapter direction
 */
export type AdapterDirection = 'Sender' | 'Receiver';

/**
 * Component configuration (generic key-value properties)
 */
export interface ComponentConfig {
    name?: string;  // Optional - will be auto-generated if not provided
    [key: string]: any;
}

/**
 * Adapter configuration (generic key-value properties)
 */
export interface AdapterConfig {
    name?: string;
    [key: string]: any;
}

/**
 * Resource configuration
 */
export interface ResourceConfig {
    type: 'groovy' | 'mapping' | 'xsd' | 'xslt';
    name: string;
    content: string;
}

/**
 * Connection configuration
 */
export interface ConnectionConfig {
    from: string;
    to: string;
}

/**
 * IFlow JSON structure
 */
export interface IFlowJson {
    name: string;
    sender?: {
        type: AdapterType;
        config: AdapterConfig;
    };
    receiver?: {
        type: AdapterType;
        config: AdapterConfig;
    };
    components?: Array<{
        id?: string;
        type: ComponentType;
        config: ComponentConfig;
    }>;
    connections?: ConnectionConfig[];
    resources?: ResourceConfig[];
    subProcesses?: Array<{
        /**
         * Logical reference key for this Local Integration Process, used by
         * a ProcessCall component's `config.processId` anywhere in this
         * JSON (main components, another subProcess, or an
         * exceptionSubprocess) to target it -- resolved automatically to
         * the actual generated technical process id by fromJson(). Falls
         * back to `name` as the lookup key if omitted, but an explicit `id`
         * is recommended since two subProcesses could share a display name.
         */
        id?: string;
        name: string;
        components?: Array<{
            id?: string;
            type: ComponentType;
            config: ComponentConfig;
        }>;
        connections?: ConnectionConfig[];
    }>;
    exceptionSubprocesses?: Array<{
        name: string;
        components?: Array<{
            id?: string;
            type: ComponentType;
            config: ComponentConfig;
        }>;
        connections?: ConnectionConfig[];
    }>;
}

/**
 * Resolves the final, XML-safe, iFlow-unique technical ID for a component
 * defined in AI JSON.
 *
 * Root cause of CP-001 ("Duplicate component ID: ProcessCall_1786467900757"):
 * several Component subclasses fall back to a `Date.now()`-based id when no
 * id is supplied, and that fallback can collide when two components of the
 * same type are constructed within the same millisecond. Passing an
 * AI-supplied `compDef.id` through avoids that fallback entirely -- but the
 * factory was not: (a) guaranteeing that id is a valid XML NCName (an AI
 * might supply a human-readable id containing spaces), or (b) guarding
 * against two different components resolving to the same id (whether two
 * identical raw ids, or two different display names/ids that sanitize to
 * the same technical name).
 *
 * This closes both gaps for every component created via fromJson(), while
 * leaving the per-class Date.now() fallback untouched as a safety net for
 * direct createComponent()/model-class usage outside fromJson() (the
 * existing "Extended API" style documented in this SDK), where no shared
 * `usedIds` set exists to dedupe against.
 *
 * @param rawId - The `id` field from the AI JSON component definition, if any
 * @param type - Component type, used only to seed a fallback id prefix
 * @param usedIds - Technical ids already assigned within this fromJson() call
 */
function resolveComponentId(rawId: string | undefined, type: string, usedIds: Set<string>): string {
    const sanitized = rawId ? toXmlTechnicalName(rawId, '') : '';
    const candidate = sanitized || IdGenerator.next(type);
    return ensureUniqueTechnicalName(candidate, usedIds);
}

/**
 * Resolves a ProcessCall's `config.processId` from the AI-supplied logical
 * subProcess reference key (the `id`, or `name` if no `id` was given -- see
 * `IFlowJson.subProcesses[].id`) to the actual generated technical id of the
 * matching LocalIntegrationProcess.
 *
 * Root cause this fixes ("The assigned Local Integration Process does not
 * exist" in SAP): a ProcessCall's `processId` must equal the exact `id` of a
 * `<bpmn2:process>` element declared elsewhere in the same .iflw (evidence:
 * process_direct_reference.zip, CallActivity_45's `processId=Process_49`
 * exactly matches the sibling `<bpmn2:process id="Process_49">`). Callers
 * building AI JSON have no way to predict that generated technical id ahead
 * of time, so without this resolution step `processId` was always either a
 * made-up string (matching nothing) or required the caller to already know
 * SAP-internal id generation -- neither is workable. This lets the caller
 * write a human-chosen key instead and resolves it here, exactly the same
 * way `componentMap` already resolves connection `from`/`to` by the AI's
 * own component ids.
 *
 * A `processId` that doesn't match any declared subProcess is left
 * unchanged (not an error here) -- `validate()`'s PC-001 check catches that
 * case explicitly, with a clearer message than a thrown exception this deep
 * in construction would give.
 */
function resolveProcessCallProcessId(
    type: string,
    config: ComponentConfig,
    subProcessMap: Map<string, LocalIntegrationProcess>
): ComponentConfig {
    if (type !== 'ProcessCall' || config.processId === undefined) {
        return config;
    }
    const target = subProcessMap.get(config.processId);
    if (!target) {
        return config;
    }
    return { ...config, processId: target.id };
}

/**
 * Creates a processing component from type and configuration
 *
 * @param type - Component type (ContentModifier, Router, GroovyScript, etc.)
 * @param config - Component configuration with name and type-specific properties
 * @param id - Optional component ID (if not provided, auto-generated)
 * @returns Component instance
 * @throws Error if type is unsupported
 *
 * @example
 * ```typescript
 * // Content Modifier
 * const cm = createComponent('ContentModifier', {
 *     name: 'Set Headers',
 *     headers: { Country: 'IN' }
 * });
 *
 * // Router
 * const router = createComponent('Router', {
 *     name: 'Route by Type',
 *     routes: [
 *         { condition: "${header.type} == 'A'", target: 'componentA' },
 *         { condition: "${header.type} == 'B'", target: 'componentB' }
 *     ]
 * });
 *
 * // Groovy Script
 * const script = createComponent('GroovyScript', {
 *     name: 'Transform',
 *     scriptName: 'transform.groovy'
 * });
 *
 * // With custom ID
 * const cmWithId = createComponent('ContentModifier', {
 *     name: 'Set Headers',
 *     headers: { Country: 'IN' }
 * }, 'modifier1');
 * ```
 */
export function createComponent(type: ComponentType, config: ComponentConfig, id?: string): Component {
    const { name, ...properties } = config;

    // Generate default name if not provided
    const componentName = name || `${type} ${id || IdGenerator.next('Comp')}`;

    switch (type) {
        case 'ContentModifier':
            // Map to Enricher registry key. Properties are validated against
            // the real schema (bodyType/wrapContent/propertyTable/headerTable
            // -- see validateContentModifierProperties()) then passed through;
            // ComponentMapper merges in registry defaults for anything unset.
            return new Component(
                id || IdGenerator.next('Enricher'),
                componentName,
                'Enricher',
                validateContentModifierProperties(properties)
            );

        case 'Router':
            const router = new Router(componentName, properties, id);
            // Apply routes if provided
            if (config.routes && Array.isArray(config.routes)) {
                for (const route of config.routes) {
                    if (route.condition) {
                        router.when(route.condition);
                        if (route.target) {
                            router.to(route.target);
                        }
                    }
                }
            }
            // Apply default route if provided
            if (config.defaultRoute) {
                router.otherwise();
                if (config.defaultRoute.target) {
                    router.to(config.defaultRoute.target);
                }
            }
            return router;

        case 'GroovyScript':
            if (!config.scriptName) {
                throw new Error('GroovyScript requires scriptName property');
            }
            return new GroovyScript(componentName, config.scriptName, properties, id);

        case 'DataStore':
            const operation = config.operation || 'put';
            const storageName = config.storageName;
            const entryId = config.entryId || '';

            if (!storageName) {
                throw new Error('DataStore requires storageName property');
            }

            switch (operation) {
                case 'put':
                    return DataStore.Write(componentName, storageName, entryId, {
                        visibility: config.visibility,
                        encrypt: config.encrypt,
                        expire: config.expire,
                        alertThreshold: config.alertThreshold
                    });
                case 'get':
                    return DataStore.Get(componentName, storageName, entryId);
                case 'delete':
                    return DataStore.Delete(componentName, storageName, entryId);
                default:
                    throw new Error(`Unsupported DataStore operation: ${operation}`);
            }

        case 'Multicast':
            return new Multicast(componentName, id);

        case 'Splitter':
            if (!config.expression) {
                throw new Error('Splitter requires expression property');
            }
            return new Splitter(
                componentName,
                config.expression,
                {
                    exprType: config.expressionType || 'XPath',
                    Streaming: config.streaming,
                    ParallelProcessing: config.parallelProcessing,
                    StopOnExecution: config.stopOnException
                },
                id
            );

        case 'Gather':
            return new Gather(
                componentName,
                config.aggregationAlgorithm || 'sap-identical-multi-mapping',
                {
                    messageType: config.messageType,
                    targetXPath: config.targetXPath,
                    sourceXPath: config.sourceXPath
                },
                id
            );

        case 'MessageMapping':
            if (!config.mappingName) {
                throw new Error('MessageMapping requires mappingName property');
            }
            // Filter out mappingName from properties to avoid duplicate in BPMN output
            const { mappingName: _, ...mappingProps } = properties;
            return new MessageMapping(componentName, config.mappingName, mappingProps, id);

        case 'XmlValidator': {
            if (!config.xsd) {
                throw new Error('XmlValidator requires xsd property');
            }
            // XmlValidator's constructor spreads additionalProperties last, so a
            // raw "xsd" left in `properties` would silently override the
            // normalized path below. Strip it out, same pattern used for
            // MessageMapping's mappingName.
            const { xsd: _xsd, ...xmlValidatorProps } = properties;
            return new XmlValidator(
                componentName,
                normalizeXsdPath(config.xsd, config.xmlSchemaSource),
                config.preventException !== undefined ? config.preventException : false,
                xmlValidatorProps,
                id
            );
        }

        case 'XsltMapping':
            if (!config.mappingName) {
                throw new Error('XsltMapping requires mappingName property');
            }
            return new XsltMapping(
                componentName,
                config.mappingName,
                config.outputFormat || 'Bytes',
                properties,
                id
            );

        case 'ProcessCall':
            if (!config.processId) {
                throw new Error('ProcessCall requires processId property');
            }
            return new ProcessCall(
                componentName,
                config.processId,
                config.looping !== undefined ? config.looping : false,
                properties,
                id
            );

        case 'JdbcCall': {
            if (!config.dataSourceAlias) {
                throw new Error('JdbcCall requires dataSourceAlias property');
            }
            // JdbcAdapter.receiver validates the property set itself (unknown
            // JDBC properties throw) -- pass everything through as-is.
            const adapter = JdbcAdapter.receiver({
                name: componentName,
                ...properties
            } as any);
            return new JdbcCall(componentName, adapter, id);
        }

        case 'ProcessDirectCall': {
            if (!config.address) {
                throw new Error('ProcessDirectCall requires address property');
            }
            // ProcessDirectAdapter.receiver validates the property set itself
            // (unknown properties throw) -- pass everything through as-is.
            const adapter = ProcessDirectAdapter.receiver({
                name: componentName,
                ...properties
            } as any);
            return new ProcessDirectCall(componentName, adapter, id);
        }

        case 'RFC':
            // RFC has no mid-flow BPMN representation in SAP Cloud
            // Integration -- evidence (rfc_reference.zip) shows it is
            // always the flow's own receiver adapter (EndEvent ->
            // Participant, the same shape as HTTP/SOAP/SFTP/IDoc), never a
            // serviceTask/callActivity step. fromJson() normalizes a
            // components[] entry with type "RFC" into "receiver" before
            // this function is ever called (see normalizeRfcComponents()),
            // so this only throws when createComponent('RFC', ...) is
            // called directly, bypassing that normalization -- give a
            // clear, actionable message instead of the generic
            // "Unsupported component type" error.
            throw new Error(
                'RFC has no mid-flow component representation in SAP Cloud Integration -- ' +
                'it is always the flow\'s receiver adapter. Use `receiver: { type: "RFC", config: {...} } ` ' +
                'instead of a components[] entry. (fromJson() normalizes this automatically when RFC ' +
                'appears in "components" -- this error only occurs when calling createComponent() directly.)'
            );

        case 'JMS':
            // JMS has no mid-flow BPMN representation in SAP Cloud
            // Integration either -- evidence (jms_reference.zip) shows both
            // its Sender (Participant -> StartEvent) and Receiver
            // (EndEvent -> Participant) messageFlows using the same
            // flow-level shape as HTTP/SOAP/SFTP/IDoc/RFC, never a
            // serviceTask/callActivity step. Use `sender`/`receiver: {
            // type: "JMS", config: {...} }` instead of a components[] entry.
            throw new Error(
                'JMS has no mid-flow component representation in SAP Cloud Integration -- ' +
                'it is always a flow-level sender or receiver adapter. Use `sender: { type: "JMS", config: {...} }` ' +
                'or `receiver: { type: "JMS", config: {...} }` instead of a components[] entry.'
            );

        default:
            throw new Error(`Unsupported component type: ${type}`);
    }
}

/**
 * Creates an adapter from type, direction, and configuration
 *
 * @param type - Adapter type (HTTP, HTTPS, OData, SFTP, SOAP, IDoc)
 * @param direction - Sender or Receiver
 * @param config - Adapter configuration
 * @returns Adapter instance (HttpAdapter, ODataAdapter, etc.)
 * @throws Error if type is unsupported
 *
 * @example
 * ```typescript
 * // HTTPS Sender
 * const sender = createAdapter('HTTPS', 'Sender', {
 *     address: '/api/orders'
 * });
 *
 * // HTTP Receiver
 * const receiver = createAdapter('HTTP', 'Receiver', {
 *     url: 'https://api.example.com/orders',
 *     method: 'POST'
 * });
 *
 * // OData Query
 * const odata = createAdapter('OData', 'Receiver', {
 *     resourcePath: 'Orders',
 *     operation: 'Query',
 *     filter: "Status eq 'Open'"
 * });
 * ```
 */
export function createAdapter(
    type: AdapterType,
    direction: AdapterDirection,
    config: AdapterConfig
): HttpAdapter | ODataAdapter | SftpAdapter | SoapAdapter | IdocAdapter | JdbcAdapter | ProcessDirectAdapter | RfcAdapter | JmsAdapter {
    // Normalize config (convert Markdown URLs to plain URLs)
    const normalizedConfig = normalizeConfig(config);

    switch (type) {
        case 'HTTP':
        case 'HTTPS':
            if (direction === 'Sender') {
                return HttpAdapter.sender({
                    name: normalizedConfig.name,
                    address: normalizedConfig.address || '/',
                    protocol: type,
                    allowedMethods: normalizedConfig.allowedMethods,
                    authentication: normalizedConfig.authentication,
                    userRole: normalizedConfig.userRole,
                    maximumBodySize: normalizedConfig.maximumBodySize
                });
            } else {
                return HttpAdapter.receiver({
                    name: normalizedConfig.name,
                    url: normalizedConfig.url,
                    method: normalizedConfig.method,
                    protocol: type,
                    authentication: normalizedConfig.authentication,
                    credentialName: normalizedConfig.credentialName,
                    timeout: normalizedConfig.timeout,
                    allowedResponseHeaders: normalizedConfig.allowedResponseHeaders
                });
            }

        case 'OData':
            if (direction === 'Sender') {
                return ODataAdapter.sender({
                    name: normalizedConfig.name || 'OData Sender',
                    resourcePath: normalizedConfig.resourcePath || '',
                    version: normalizedConfig.version,
                    pollingInterval: normalizedConfig.pollingInterval,
                    authentication: normalizedConfig.authentication,
                    credentialName: normalizedConfig.credentialName,
                    filter: normalizedConfig.filter,
                    select: normalizedConfig.select
                });
            } else {
                return ODataAdapter.receiver({
                    name: normalizedConfig.name || 'OData Receiver',
                    resourcePath: normalizedConfig.resourcePath || '',
                    operation: normalizedConfig.operation || 'Query',
                    address: normalizedConfig.address,
                    version: normalizedConfig.version,
                    authentication: normalizedConfig.authentication,
                    credentialName: normalizedConfig.credentialName,
                    timeout: normalizedConfig.timeout,
                    filter: normalizedConfig.filter,
                    select: normalizedConfig.select,
                    expand: normalizedConfig.expand,
                    top: normalizedConfig.top,
                    skip: normalizedConfig.skip
                });
            }

        case 'SFTP':
            if (direction === 'Sender') {
                return SftpAdapter.sender({
                    name: normalizedConfig.name,
                    directory: normalizedConfig.directory || '/',
                    filePattern: normalizedConfig.filePattern,
                    host: normalizedConfig.host || '',
                    port: normalizedConfig.port,
                    credentialName: normalizedConfig.credentialName || '',
                    authentication: normalizedConfig.authentication,
                    privateKeyAlias: normalizedConfig.privateKeyAlias,
                    pollingInterval: normalizedConfig.pollingInterval,
                    maxMessagesPerPoll: normalizedConfig.maxMessagesPerPoll,
                    postProcessing: normalizedConfig.postProcessing,
                    archiveDirectory: normalizedConfig.archiveDirectory,
                    sorting: normalizedConfig.sorting
                });
            } else {
                return SftpAdapter.receiver({
                    name: normalizedConfig.name,
                    directory: normalizedConfig.directory || '/',
                    fileName: normalizedConfig.fileName || '',
                    host: normalizedConfig.host || '',
                    port: normalizedConfig.port,
                    credentialName: normalizedConfig.credentialName || '',
                    authentication: normalizedConfig.authentication,
                    privateKeyAlias: normalizedConfig.privateKeyAlias,
                    fileExists: normalizedConfig.fileExists,
                    createDirectory: normalizedConfig.createDirectory
                });
            }

        case 'SOAP':
            if (direction === 'Sender') {
                // SOAP Sender not commonly used, create basic adapter.
                // Constructed directly (SoapAdapter has no .sender() factory)
                // so, unlike .receiver(), the channel name must be sanitized
                // here rather than inside the class.
                const soapSenderDisplayName = normalizedConfig.name || 'SOAP Sender';
                const soapSenderChannelName = toXmlTechnicalName(soapSenderDisplayName, 'SOAP_Sender');
                return new SoapAdapter(
                    soapSenderChannelName,
                    'Sender',
                    {
                        address: normalizedConfig.address || '/',
                        ...normalizedConfig,
                        // SAP rejects whitespace in this "Name" property too,
                        // not just the channel name -- use the same
                        // sanitized value.
                        Name: soapSenderChannelName,
                        Description: ''
                    }
                );
            } else {
                return SoapAdapter.receiver({
                    name: normalizedConfig.name || 'SOAP Receiver',
                    url: normalizedConfig.url,
                    soapAction: normalizedConfig.soapAction,
                    soapVersion: normalizedConfig.soapVersion,
                    authentication: normalizedConfig.authentication,
                    credentialName: normalizedConfig.credentialName,
                    timeout: normalizedConfig.timeout,
                    wsSecurity: normalizedConfig.wsSecurity,
                    privateKeyAlias: normalizedConfig.privateKeyAlias,
                    proxyType: normalizedConfig.proxyType,
                    locationId: normalizedConfig.locationId
                });
            }

        case 'IDoc':
            if (direction === 'Sender') {
                return IdocAdapter.sender({
                    name: normalizedConfig.name || 'IDoc Sender',
                    address: normalizedConfig.address || '',
                    credentialName: normalizedConfig.credentialName || ''
                });
            } else {
                return IdocAdapter.receiver({
                    name: normalizedConfig.name || 'IDoc Receiver',
                    address: normalizedConfig.address || '',
                    credentialName: normalizedConfig.credentialName || '',
                    locationId: normalizedConfig.locationId,
                    sapMessageIdDetermination: normalizedConfig.sapMessageIdDetermination,
                    timeout: normalizedConfig.timeout,
                    compressMessage: normalizedConfig.compressMessage
                });
            }

        case 'JDBC':
            if (direction === 'Sender') {
                throw new Error('JDBC adapter does not support Sender direction (SAP CPI has no JDBC sender)');
            }
            return JdbcAdapter.receiver({
                name: normalizedConfig.name,
                dataSourceAlias: normalizedConfig.dataSourceAlias,
                system: normalizedConfig.system,
                connectionTimeout: normalizedConfig.connectionTimeout,
                queryTimeout: normalizedConfig.queryTimeout,
                maxRecords: normalizedConfig.maxRecords,
                batchMode: normalizedConfig.batchMode,
                batchOperation: normalizedConfig.batchOperation
            });

        case 'ProcessDirect':
            if (direction === 'Sender') {
                return ProcessDirectAdapter.sender({
                    name: normalizedConfig.name,
                    address: normalizedConfig.address,
                    system: normalizedConfig.system
                });
            }
            return ProcessDirectAdapter.receiver({
                name: normalizedConfig.name,
                address: normalizedConfig.address,
                system: normalizedConfig.system
            });

        case 'RFC':
            if (direction === 'Sender') {
                throw new Error('RFC adapter does not support Sender direction (SAP CPI has no RFC sender -- RFC is always an outbound call from CPI into an SAP system)');
            }
            // Unlike the other flow-level adapter cases above (which
            // enumerate known config fields only), this spreads the full
            // config through: RFC has no mid-flow call component to catch
            // an unsupported property the way JdbcCall/ProcessDirectCall do
            // for their adapters, so this is the only place a typo'd or
            // invented RFC property can be rejected end-to-end via
            // fromJson() rather than silently dropped. RfcAdapter.receiver()
            // itself throws on any key outside its documented set.
            return RfcAdapter.receiver({ ...normalizedConfig } as any);

        case 'JMS':
            // Like RFC above, JMS has no mid-flow call component to catch
            // an unsupported property, so the full config is spread through
            // rather than enumerated -- JmsAdapter.sender()/.receiver()
            // itself throws on any key outside its documented set. Unlike
            // RFC, JMS genuinely supports both directions (evidence:
            // jms_reference.zip).
            if (direction === 'Sender') {
                return JmsAdapter.sender({ ...normalizedConfig } as any);
            }
            return JmsAdapter.receiver({ ...normalizedConfig } as any);

        default:
            throw new Error(`Unsupported adapter type: ${type}`);
    }
}

/**
 * Creates a complete IFlow from AI-generated JSON
 *
 * @param json - IFlow JSON structure
 * @returns IFlow instance with all components, adapters, and connections
 * @throws Error if JSON structure is invalid
 *
 * @example
 * ```typescript
 * const json = {
 *     name: "Order Processing",
 *     sender: {
 *         type: "HTTPS",
 *         config: { address: "/api/orders" }
 *     },
 *     components: [
 *         {
 *             id: "script1",
 *             type: "GroovyScript",
 *             config: {
 *                 name: "Transform",
 *                 scriptName: "transform.groovy"
 *             }
 *         }
 *     ],
 *     receiver: {
 *         type: "HTTP",
 *         config: {
 *             url: "https://api.example.com/orders",
 *             method: "POST"
 *         }
 *     },
 *     connections: [
 *         { from: "StartEvent", to: "script1" },
 *         { from: "script1", to: "EndEvent" }
 *     ],
 *     resources: [
 *         {
 *             type: "groovy",
 *             name: "transform.groovy",
 *             content: "def Message processData(Message message) { ... }"
 *         }
 *     ]
 * };
 *
 * const flow = fromJson(json);
 * const zipBuffer = await compileToZip(flow);
 * ```
 */

/**
 * Normalizes a common AI-generated JSON mistake: declaring RFC as a
 * mid-flow "component" step (e.g. `{ id: "rfc_receiver_component", type:
 * "RFC", config: {...} }`) instead of, or in addition to, the compiler's
 * actual RFC representation, `receiver: { type: "RFC", config: {...} }`.
 *
 * Per SAP evidence (rfc_reference.zip, "Send Quality Deviation from D3 to
 * S4HANA.iflw"), RFC has no mid-flow BPMN shape at all -- it is always the
 * flow's own EndEvent -> Receiver messageFlow, exactly like HTTP/SOAP/
 * SFTP/IDoc. There is nothing to compile for an RFC "step" placed in the
 * middle of a component chain, because SAP itself has no such element.
 *
 * Rather than reject this shape outright (`createComponent()` would throw
 * "Unsupported component type: RFC", the exact regression reported --
 * whose only "fix" from a blind retry is deleting RFC support entirely),
 * this function recognizes the intent and rewrites the JSON in place
 * before the rest of `fromJson()` runs:
 *   - the RFC component definition is removed from `components`
 *   - `receiver` is set (or verified consistent) from its config
 *   - the connection into it is repointed to the flow's actual "receiver"
 *     endpoint, and the redundant "-> receiver" edge after it is dropped
 *
 * This is a shape-normalization, not a silent fallback: it still throws on
 * genuine ambiguity rather than guessing --
 *   - more than one RFC component declared (RFC is not a multi-instance,
 *     mid-flow component -- a flow has exactly one receiver),
 *   - an RFC component AND a `receiver` of a different adapter type,
 *   - an RFC component AND a `receiver` of type RFC with DIFFERENT config,
 *   - an RFC component with an outgoing connection to anything other than
 *     "receiver" (RFC is always the flow's terminal step).
 * Each of those throws a specific, actionable error instead of resolving
 * to a guess.
 */
function normalizeRfcComponents(json: IFlowJson): IFlowJson {
    if (!json.components) {
        return json;
    }

    const rfcComponents = json.components.filter(c => c.type === 'RFC');
    if (rfcComponents.length === 0) {
        return json;
    }

    if (rfcComponents.length > 1) {
        throw new Error(
            'Multiple RFC components declared. RFC has no mid-flow representation in SAP Cloud Integration -- ' +
            'it is always the flow\'s own receiver adapter (a flow has exactly one). Declare a single ' +
            '"receiver": { "type": "RFC", "config": {...} } instead.'
        );
    }

    const rfcComponent = rfcComponents[0];
    const rfcId = rfcComponent.id;

    if (json.receiver && json.receiver.type !== 'RFC') {
        throw new Error(
            `Flow declares both an RFC component ("${rfcId}") and a receiver of type "${json.receiver.type}". ` +
            'RFC has no mid-flow representation -- it must be the flow\'s only receiver. Remove one of the two.'
        );
    }

    if (json.receiver && json.receiver.type === 'RFC') {
        // Both declared -- they must agree, otherwise which config should
        // win is ambiguous and must not be silently guessed.
        if (JSON.stringify(rfcComponent.config) !== JSON.stringify(json.receiver.config)) {
            throw new Error(
                `Flow declares both an RFC component ("${rfcId}") and a "receiver" of type RFC with different ` +
                'configuration. RFC has no mid-flow representation -- declare it once, as ' +
                '"receiver": { "type": "RFC", "config": {...} }.'
            );
        }
    }

    const connections = json.connections || [];
    const invalidOutgoing = connections.filter(conn => conn.from === rfcId && conn.to !== 'receiver');
    if (invalidOutgoing.length > 0) {
        throw new Error(
            `RFC component "${rfcId}" has an outgoing connection to "${invalidOutgoing[0].to}", but RFC is ` +
            'always the flow\'s terminal receiver step in SAP Cloud Integration -- nothing can follow it.'
        );
    }

    return {
        ...json,
        components: json.components.filter(c => c !== rfcComponent),
        connections: connections
            .filter(conn => !(conn.from === rfcId && conn.to === 'receiver')) // drop the now-redundant rfc -> receiver edge
            .map(conn => conn.to === rfcId ? { ...conn, to: 'receiver' } : conn),
        receiver: { type: 'RFC', config: rfcComponent.config }
    };
}

export function fromJson(json: IFlowJson): IFlow {
    // Normalize an RFC "component" (a common AI JSON mistake -- see
    // normalizeRfcComponents() doc) into the compiler's real RFC
    // representation before anything else runs.
    json = normalizeRfcComponents(json);

    // Validate required fields
    if (!json.name) {
        throw new Error('IFlow JSON requires name property');
    }

    // Create IFlow
    const flow = new IFlow(json.name);

    // Component ID mapping (AI IDs → actual Component instances)
    const componentMap = new Map<string, Component>();

    // Technical (XML) ids assigned so far in this flow -- shared across main
    // components, subprocess components, and exception-subprocess components,
    // since all of them land in the same generated .iflw and must not collide
    // (see resolveComponentId() for why this exists / CP-001 root cause).
    const usedComponentIds = new Set<string>();

    // Pre-pass: create Local Integration Process "shells" (id/name only) for
    // every declared subProcess BEFORE any component is created, so a
    // ProcessCall anywhere in this JSON (main components, another
    // subProcess, or an exceptionSubprocess -- matches real evidence, where
    // the ProcessCall lives inside an exception subprocess) can resolve its
    // `processId` against an AI-supplied logical key to the real generated
    // technical process id via resolveProcessCallProcessId(). Components and
    // connections for each subprocess are filled in later, in the "Add
    // subprocesses" section below, reusing these exact shell instances --
    // never constructing a second LocalIntegrationProcess per subDef (that
    // would silently orphan whichever one wasn't the one actually attached
    // to the flow).
    const subProcessShells: LocalIntegrationProcess[] = [];
    const subProcessMap = new Map<string, LocalIntegrationProcess>();
    if (json.subProcesses) {
        for (const subDef of json.subProcesses) {
            const technicalId = subDef.id
                ? ensureUniqueTechnicalName(toXmlTechnicalName(subDef.id, ''), usedComponentIds)
                : undefined;
            const subprocess = new LocalIntegrationProcess(subDef.name, "From Calling Process", {}, technicalId);
            usedComponentIds.add(subprocess.id);
            subProcessShells.push(subprocess);
            subProcessMap.set(subDef.id || subDef.name, subprocess);
        }
    }

    // Set sender adapter
    if (json.sender) {
        const sender = createAdapter(json.sender.type, 'Sender', json.sender.config);
        flow.setSender(sender);
    }

    // Set receiver adapter
    if (json.receiver) {
        const receiver = createAdapter(json.receiver.type, 'Receiver', json.receiver.config);
        flow.setReceiver(receiver);
    }

    // Add components
    if (json.components) {
        for (const compDef of json.components) {
            const resolvedId = resolveComponentId(compDef.id, compDef.type, usedComponentIds);
            const resolvedConfig = resolveProcessCallProcessId(compDef.type, compDef.config, subProcessMap);
            const component = createComponent(compDef.type, resolvedConfig, resolvedId);
            flow.addComponent(component);

            // Store mapping from AI ID to actual component. Keyed by the RAW
            // AI-supplied id (not the sanitized technical id) so connections
            // in the JSON keep resolving by the id the caller actually wrote --
            // sanitization only affects what appears in the generated XML.
            componentMap.set(compDef.id || component.id, component);
        }
    }

    // Add resources
    if (json.resources) {
        for (const resDef of json.resources) {
            let resource;

            switch (resDef.type) {
                case 'groovy':
                    resource = new GroovyResource(resDef.name, resDef.content);
                    break;
                case 'mapping':
                    resource = new MappingResource(resDef.name, resDef.content);
                    break;
                case 'xsd':
                    resource = new XsdResource(resDef.name, resDef.content);
                    break;
                case 'xslt':
                    resource = new XsltResource(resDef.name, resDef.content);
                    break;
                default:
                    throw new Error(`Unsupported resource type: ${resDef.type}`);
            }

            flow.addResource(resource);
        }
    }

    // Add subprocesses (reusing the shells created in the pre-pass above --
    // see the comment there for why a second `new LocalIntegrationProcess`
    // per subDef must never happen)
    if (json.subProcesses) {
        json.subProcesses.forEach((subDef, index) => {
            const subprocess = subProcessShells[index];

            // Add subprocess components
            if (subDef.components) {
                for (const compDef of subDef.components) {
                    const resolvedId = resolveComponentId(compDef.id, compDef.type, usedComponentIds);
                    const resolvedConfig = resolveProcessCallProcessId(compDef.type, compDef.config, subProcessMap);
                    const component = createComponent(compDef.type, resolvedConfig, resolvedId);
                    subprocess.addComponent(component);

                    componentMap.set(compDef.id || component.id, component);
                }
            }

            // Add subprocess connections
            if (subDef.connections) {
                for (const conn of subDef.connections) {
                    const fromComp = componentMap.get(conn.from);
                    const toComp = componentMap.get(conn.to);

                    if (fromComp && toComp) {
                        subprocess.connect(fromComp, toComp);
                    }
                }
            }

            flow.addSubProcess(subprocess);
        });
    }

    // Add exception subprocesses
    if (json.exceptionSubprocesses) {
        for (const exDef of json.exceptionSubprocesses) {
            const exSubprocess = new ExceptionSubprocess(exDef.name);

            // Add exception subprocess components. Note: real SAP evidence
            // (process_direct_reference.zip) shows a ProcessCall to a Local
            // Integration Process is typically placed HERE, inside an
            // exception subprocess -- so this resolution step matters just
            // as much as the main-components one above.
            if (exDef.components) {
                for (const compDef of exDef.components) {
                    const resolvedId = resolveComponentId(compDef.id, compDef.type, usedComponentIds);
                    const resolvedConfig = resolveProcessCallProcessId(compDef.type, compDef.config, subProcessMap);
                    const component = createComponent(compDef.type, resolvedConfig, resolvedId);
                    exSubprocess.addComponent(component);

                    componentMap.set(compDef.id || component.id, component);
                }
            }

            // Add exception subprocess connections
            if (exDef.connections) {
                for (const conn of exDef.connections) {
                    const fromComp = componentMap.get(conn.from);
                    const toComp = componentMap.get(conn.to);

                    if (fromComp && toComp) {
                        exSubprocess.connect(fromComp, toComp);
                    }
                }
            }

            flow.addExceptionSubprocess(exSubprocess);
        }
    }

    // Add connections
    if (json.connections) {
        for (const conn of json.connections) {
            // Handle special cases for StartEvent/EndEvent
            if (conn.from === 'StartEvent' || conn.to === 'EndEvent') {
                // These connections are implicit in IFlow model
                // They will be created by the mapper/compiler
                continue;
            }

            // Skip sender → component and component → receiver ONLY if they are
            // implicit flow endpoints (not actual components with those IDs)
            // Check componentMap to distinguish between:
            // - "sender"/"receiver" as flow adapters (implicit) → skip
            // - "sender"/"receiver" as component IDs (explicit) → process normally
            if ((conn.from === 'sender' && !componentMap.has('sender')) ||
                (conn.to === 'receiver' && !componentMap.has('receiver'))) {
                continue;
            }

            const fromComp = componentMap.get(conn.from);
            const toComp = componentMap.get(conn.to);

            if (!fromComp) {
                throw new Error(`Connection source component not found: ${conn.from}`);
            }
            if (!toComp) {
                throw new Error(`Connection target component not found: ${conn.to}`);
            }

            flow.connect(fromComp, toComp);
        }
    }

    // Store canonical ID mapping for validation
    flow.setCanonicalIdMap(componentMap);

    return flow;
}
