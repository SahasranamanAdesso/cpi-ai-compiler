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
    | 'ProcessCall';

/**
 * Supported adapter types
 */
export type AdapterType =
    | 'HTTP'
    | 'HTTPS'
    | 'OData'
    | 'SFTP'
    | 'SOAP'
    | 'IDoc';

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
                        expire: config.expire
                    });
                case 'get':
                    return DataStore.Get(componentName, storageName, entryId);
                case 'delete':
                    return DataStore.Delete(componentName, storageName, entryId);
                default:
                    throw new Error(`Unsupported DataStore operation: ${operation}`);
            }

        case 'Multicast':
            return new Multicast(componentName);

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
                }
            );

        case 'Gather':
            return new Gather(
                componentName,
                config.aggregationAlgorithm || 'sap-identical-multi-mapping',
                {
                    messageType: config.messageType,
                    targetXPath: config.targetXPath,
                    sourceXPath: config.sourceXPath
                }
            );

        case 'MessageMapping':
            if (!config.mappingName) {
                throw new Error('MessageMapping requires mappingName property');
            }
            // Filter out mappingName from properties to avoid duplicate in BPMN output
            const { mappingName: _, ...mappingProps } = properties;
            return new MessageMapping(componentName, config.mappingName, mappingProps);

        case 'XmlValidator':
            if (!config.xsd) {
                throw new Error('XmlValidator requires xsd property');
            }
            return new XmlValidator(
                componentName,
                config.xsd,
                config.preventException !== undefined ? config.preventException : false,
                properties
            );

        case 'XsltMapping':
            if (!config.mappingName) {
                throw new Error('XsltMapping requires mappingName property');
            }
            return new XsltMapping(
                componentName,
                config.mappingName,
                config.outputFormat || 'Bytes',
                properties
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
): HttpAdapter | ODataAdapter | SftpAdapter | SoapAdapter | IdocAdapter {
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
                // SOAP Sender not commonly used, create basic adapter
                return new SoapAdapter(
                    normalizedConfig.name || 'SOAP Sender',
                    'Sender',
                    {
                        address: normalizedConfig.address || '/',
                        ...normalizedConfig
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
            const component = createComponent(compDef.type, compDef.config, compDef.id);
            flow.addComponent(component);

            // Store mapping from AI ID to actual component
            // Use component.id as the key (which is either the provided id or auto-generated)
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
                    const component = createComponent(compDef.type, compDef.config, compDef.id);
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
                    const component = createComponent(compDef.type, compDef.config, compDef.id);
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
