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
    | 'JdbcCall';

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
    | 'JDBC';

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
            // Map to Enricher registry key
            // Properties are passed as-is to the Component
            // The compiler will handle conversion to SAP format
            return new Component(
                id || IdGenerator.next('Enricher'),
                componentName,
                'Enricher',
                properties
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
): HttpAdapter | ODataAdapter | SftpAdapter | SoapAdapter | IdocAdapter | JdbcAdapter {
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
export function fromJson(json: IFlowJson): IFlow {
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
            const component = createComponent(compDef.type, compDef.config, resolvedId);
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

    // Add subprocesses
    if (json.subProcesses) {
        for (const subDef of json.subProcesses) {
            const subprocess = new LocalIntegrationProcess(subDef.name);

            // Add subprocess components
            if (subDef.components) {
                for (const compDef of subDef.components) {
                    const resolvedId = resolveComponentId(compDef.id, compDef.type, usedComponentIds);
                    const component = createComponent(compDef.type, compDef.config, resolvedId);
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
        }
    }

    // Add exception subprocesses
    if (json.exceptionSubprocesses) {
        for (const exDef of json.exceptionSubprocesses) {
            const exSubprocess = new ExceptionSubprocess(exDef.name);

            // Add exception subprocess components
            if (exDef.components) {
                for (const compDef of exDef.components) {
                    const resolvedId = resolveComponentId(compDef.id, compDef.type, usedComponentIds);
                    const component = createComponent(compDef.type, compDef.config, resolvedId);
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
