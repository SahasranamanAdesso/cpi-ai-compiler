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
    name: string;
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
 * ```
 */
export function createComponent(type: ComponentType, config: ComponentConfig): Component {
    const { name, ...properties } = config;

    switch (type) {
        case 'ContentModifier':
            // Map to Enricher registry key
            return new Component(
                IdGenerator.next('Enricher'),
                name,
                'Enricher',
                properties
            );

        case 'Router':
            const router = new Router(name, properties);
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
            return new GroovyScript(name, config.scriptName, properties);

        case 'DataStore':
            const operation = config.operation || 'put';
            const storageName = config.storageName;
            const entryId = config.entryId || '';

            if (!storageName) {
                throw new Error('DataStore requires storageName property');
            }

            switch (operation) {
                case 'put':
                    return DataStore.Write(name, storageName, entryId, {
                        visibility: config.visibility,
                        encrypt: config.encrypt,
                        expire: config.expire
                    });
                case 'get':
                    return DataStore.Get(name, storageName, entryId);
                case 'delete':
                    return DataStore.Delete(name, storageName, entryId);
                default:
                    throw new Error(`Unsupported DataStore operation: ${operation}`);
            }

        case 'Multicast':
            return new Multicast(name);

        case 'Splitter':
            if (!config.expression) {
                throw new Error('Splitter requires expression property');
            }
            return new Splitter(
                name,
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
                name,
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
            return new MessageMapping(name, config.mappingName, properties);

        case 'XmlValidator':
            if (!config.xsd) {
                throw new Error('XmlValidator requires xsd property');
            }
            return new XmlValidator(
                name,
                config.xsd,
                config.preventException !== undefined ? config.preventException : false,
                properties
            );

        case 'XsltMapping':
            if (!config.mappingName) {
                throw new Error('XsltMapping requires mappingName property');
            }
            return new XsltMapping(
                name,
                config.mappingName,
                config.outputFormat || 'Bytes',
                properties
            );

        case 'ProcessCall':
            if (!config.processId) {
                throw new Error('ProcessCall requires processId property');
            }
            return new ProcessCall(
                name,
                config.processId,
                config.looping !== undefined ? config.looping : false,
                properties
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
    switch (type) {
        case 'HTTP':
        case 'HTTPS':
            if (direction === 'Sender') {
                return HttpAdapter.sender({
                    name: config.name,
                    address: config.address || '/',
                    protocol: type,
                    allowedMethods: config.allowedMethods,
                    authentication: config.authentication,
                    userRole: config.userRole,
                    maximumBodySize: config.maximumBodySize
                });
            } else {
                return HttpAdapter.receiver({
                    name: config.name,
                    url: config.url,
                    method: config.method,
                    protocol: type,
                    authentication: config.authentication,
                    credentialName: config.credentialName,
                    timeout: config.timeout,
                    allowedResponseHeaders: config.allowedResponseHeaders
                });
            }

        case 'OData':
            if (direction === 'Sender') {
                return ODataAdapter.sender({
                    name: config.name || 'OData Sender',
                    resourcePath: config.resourcePath || '',
                    version: config.version,
                    pollingInterval: config.pollingInterval,
                    authentication: config.authentication,
                    credentialName: config.credentialName,
                    filter: config.filter,
                    select: config.select
                });
            } else {
                return ODataAdapter.receiver({
                    name: config.name || 'OData Receiver',
                    resourcePath: config.resourcePath || '',
                    operation: config.operation || 'Query',
                    address: config.address,
                    version: config.version,
                    authentication: config.authentication,
                    credentialName: config.credentialName,
                    timeout: config.timeout,
                    filter: config.filter,
                    select: config.select,
                    expand: config.expand,
                    top: config.top,
                    skip: config.skip
                });
            }

        case 'SFTP':
            if (direction === 'Sender') {
                return SftpAdapter.sender({
                    name: config.name,
                    directory: config.directory || '/',
                    filePattern: config.filePattern,
                    host: config.host || '',
                    port: config.port,
                    credentialName: config.credentialName || '',
                    authentication: config.authentication,
                    privateKeyAlias: config.privateKeyAlias,
                    pollingInterval: config.pollingInterval,
                    maxMessagesPerPoll: config.maxMessagesPerPoll,
                    postProcessing: config.postProcessing,
                    archiveDirectory: config.archiveDirectory,
                    sorting: config.sorting
                });
            } else {
                return SftpAdapter.receiver({
                    name: config.name,
                    directory: config.directory || '/',
                    fileName: config.fileName || '',
                    host: config.host || '',
                    port: config.port,
                    credentialName: config.credentialName || '',
                    authentication: config.authentication,
                    privateKeyAlias: config.privateKeyAlias,
                    fileExists: config.fileExists,
                    createDirectory: config.createDirectory
                });
            }

        case 'SOAP':
            if (direction === 'Sender') {
                // SOAP Sender not commonly used, create basic adapter
                return new SoapAdapter(
                    config.name || 'SOAP Sender',
                    'Sender',
                    {
                        address: config.address || '/',
                        ...config
                    }
                );
            } else {
                return SoapAdapter.receiver({
                    name: config.name || 'SOAP Receiver',
                    url: config.url,
                    soapAction: config.soapAction,
                    soapVersion: config.soapVersion,
                    authentication: config.authentication,
                    credentialName: config.credentialName,
                    timeout: config.timeout,
                    wsSecurity: config.wsSecurity,
                    privateKeyAlias: config.privateKeyAlias,
                    proxyType: config.proxyType,
                    locationId: config.locationId
                });
            }

        case 'IDoc':
            if (direction === 'Sender') {
                return IdocAdapter.sender({
                    name: config.name || 'IDoc Sender',
                    address: config.address || '',
                    credentialName: config.credentialName || ''
                });
            } else {
                return IdocAdapter.receiver({
                    name: config.name || 'IDoc Receiver',
                    address: config.address || '',
                    credentialName: config.credentialName || '',
                    locationId: config.locationId,
                    sapMessageIdDetermination: config.sapMessageIdDetermination,
                    timeout: config.timeout,
                    compressMessage: config.compressMessage
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
            const component = createComponent(compDef.type, compDef.config);
            flow.addComponent(component);

            // Store mapping from AI ID to actual component
            if (compDef.id) {
                componentMap.set(compDef.id, component);
            }
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
                    const component = createComponent(compDef.type, compDef.config);
                    subprocess.addComponent(component);

                    if (compDef.id) {
                        componentMap.set(compDef.id, component);
                    }
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
                    const component = createComponent(compDef.type, compDef.config);
                    exSubprocess.addComponent(component);

                    if (compDef.id) {
                        componentMap.set(compDef.id, component);
                    }
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

    return flow;
}
