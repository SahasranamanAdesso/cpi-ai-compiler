/**
 * Capabilities API - Expose compiler metadata for AI/CAP consumption
 *
 * This module provides a read-only view of the compiler's canonical metadata,
 * allowing AI/CAP layers to discover supported components, adapters, and their
 * configuration requirements without duplicating the registry.
 *
 * SINGLE SOURCE OF TRUTH: All data comes from existing ComponentRegistry,
 * ComponentFactory, and component class constructors.
 */

import { ComponentRegistry, ComponentDefinition } from '../registry/ComponentRegistry';
import { ComponentType, AdapterType, AdapterDirection } from '../factory/ComponentFactory';

/**
 * Component capability metadata
 */
export interface ComponentCapability {
    /** Component type name (e.g., "ContentModifier", "GroovyScript") */
    type: ComponentType;

    /** Human-readable display name */
    displayName: string;

    /** Required configuration properties */
    requiredProperties: string[];

    /** Optional configuration properties with descriptions */
    optionalProperties: Record<string, string>;

    /** Example configuration */
    example?: Record<string, any>;

    /** Special requirements and validation rules */
    notes?: string;
}

/**
 * Adapter capability metadata
 */
export interface AdapterCapability {
    /** Adapter type (e.g., "HTTP", "HTTPS", "OData") */
    type: AdapterType;

    /** Direction: Sender or Receiver */
    direction: AdapterDirection;

    /** Human-readable display name */
    displayName: string;

    /** Required configuration properties */
    requiredProperties: string[];

    /** Optional configuration properties with descriptions */
    optionalProperties: Record<string, string>;

    /** Example configuration */
    example?: Record<string, any>;
}

/**
 * Complete capabilities response
 */
export interface Capabilities {
    /** Supported component types with metadata */
    components: ComponentCapability[];

    /** Supported adapter types with metadata */
    adapters: AdapterCapability[];

    /** Supported resource types */
    resources: string[];
}

/**
 * Component-specific configuration requirements
 * Derived from ComponentFactory validation logic
 */
const COMPONENT_REQUIREMENTS: Record<ComponentType, { required: string[]; optional: Record<string, string>; example?: Record<string, any>; notes?: string }> = {
    'ContentModifier': {
        required: [],
        optional: {
            'name': 'Display name for the component',
            'bodyType': 'Body modification type',
            'propertyTable': 'Message properties table',
            'headerTable': 'Message headers table',
            'wrapContent': 'Content wrapping configuration'
        },
        example: {
            name: 'Set Country Header'
        }
    },
    'Router': {
        required: [],
        optional: {
            'name': 'Display name for the component',
            'routes': 'Array of routing conditions and targets - each route must have {condition, target}',
            'defaultRoute': 'Default route when no condition matches - must have {target}'
        },
        example: {
            name: 'Route by Type',
            routes: [
                { condition: "${header.type} == 'A'", target: 'componentA' },
                { condition: "${header.type} == 'B'", target: 'componentB' }
            ],
            defaultRoute: { target: 'defaultComponent' }
        },
        notes: 'CRITICAL: Router requires BOTH routes configuration AND corresponding connections. For each route (including defaultRoute), you MUST add a connection from the router ID to the route target. Validation error RT-003 occurs when the number of connections does not match the number of routes. Minimum 2 routes required (at least 1 conditional route + 1 default route).'
    },
    'GroovyScript': {
        required: ['scriptName'],
        optional: {
            'name': 'Display name for the component'
        },
        example: {
            name: 'Transform Order',
            scriptName: 'transform.groovy'
        }
    },
    'DataStore': {
        required: ['storageName'],
        optional: {
            'name': 'Display name for the component',
            'operation': 'Operation type: put, get, or delete',
            'entryId': 'Unique identifier for the entry',
            'visibility': 'local or global',
            'encrypt': 'Whether to encrypt the data',
            'expire': 'TTL in days'
        },
        example: {
            name: 'Store Order',
            operation: 'put',
            storageName: 'OrderStore',
            entryId: '${header.orderId}'
        }
    },
    'Multicast': {
        required: [],
        optional: {
            'name': 'Display name for the component'
        },
        example: {
            name: 'Send to Multiple Systems'
        }
    },
    'Splitter': {
        required: ['expression'],
        optional: {
            'name': 'Display name for the component',
            'expressionType': 'XPath or Token',
            'streaming': 'Enable streaming for large messages',
            'parallelProcessing': 'Enable parallel processing',
            'stopOnException': 'Stop on first exception'
        },
        example: {
            name: 'Split Orders',
            expression: '/Orders/Order',
            expressionType: 'XPath'
        }
    },
    'Gather': {
        required: [],
        optional: {
            'name': 'Display name for the component',
            'aggregationAlgorithm': 'Algorithm for aggregating messages',
            'messageType': 'Message type format',
            'targetXPath': 'Target XPath for aggregation',
            'sourceXPath': 'Source XPath for aggregation'
        },
        example: {
            name: 'Aggregate Results',
            aggregationAlgorithm: 'sap-identical-multi-mapping'
        }
    },
    'MessageMapping': {
        required: ['mappingName'],
        optional: {
            'name': 'Display name for the component'
        },
        example: {
            name: 'Transform to Invoice',
            mappingName: 'Order_to_Invoice.mmap'
        }
    },
    'XmlValidator': {
        required: ['xsd'],
        optional: {
            'name': 'Display name for the component',
            'preventException': 'Continue with errors in headers instead of throwing'
        },
        example: {
            name: 'Validate Order',
            xsd: '/xsd/OrderSchema.xsd'
        }
    },
    'XsltMapping': {
        required: ['mappingName'],
        optional: {
            'name': 'Display name for the component',
            'outputFormat': 'Bytes or String'
        },
        example: {
            name: 'Transform to Invoice',
            mappingName: 'OrderToInvoice.xsl'
        }
    },
    'ProcessCall': {
        required: ['processId'],
        optional: {
            'name': 'Display name for the component',
            'looping': 'Whether to loop over message splits'
        },
        example: {
            name: 'Call Data Lookup',
            processId: 'subprocess_id'
        }
    }
};

/**
 * Adapter-specific configuration requirements
 */
const ADAPTER_REQUIREMENTS: Record<AdapterType, Record<AdapterDirection, { required: string[]; optional: Record<string, string>; example?: Record<string, any> }>> = {
    'HTTP': {
        'Sender': {
            required: ['address'],
            optional: {
                'name': 'Display name',
                'allowedMethods': 'Allowed HTTP methods',
                'authentication': 'Authentication type',
                'userRole': 'User role for authorization'
            },
            example: {
                address: '/api/orders'
            }
        },
        'Receiver': {
            required: [],
            optional: {
                'name': 'Display name',
                'url': 'Target URL',
                'method': 'HTTP method',
                'authentication': 'Authentication type',
                'credentialName': 'Credential name'
            },
            example: {
                url: 'https://api.example.com/orders',
                method: 'POST'
            }
        }
    },
    'HTTPS': {
        'Sender': {
            required: ['address'],
            optional: {
                'name': 'Display name',
                'allowedMethods': 'Allowed HTTP methods',
                'authentication': 'Authentication type',
                'userRole': 'User role for authorization'
            },
            example: {
                address: '/api/orders'
            }
        },
        'Receiver': {
            required: [],
            optional: {
                'name': 'Display name',
                'url': 'Target URL',
                'method': 'HTTP method',
                'authentication': 'Authentication type',
                'credentialName': 'Credential name'
            },
            example: {
                url: 'https://api.example.com/orders',
                method: 'POST'
            }
        }
    },
    'OData': {
        'Sender': {
            required: ['resourcePath'],
            optional: {
                'name': 'Display name',
                'version': 'OData version (V2 or V4)',
                'pollingInterval': 'Polling interval in ms',
                'filter': 'OData filter expression'
            },
            example: {
                resourcePath: 'Orders'
            }
        },
        'Receiver': {
            required: ['resourcePath', 'operation'],
            optional: {
                'name': 'Display name',
                'version': 'OData version (V2 or V4)',
                'filter': 'OData filter expression',
                'address': 'Service address'
            },
            example: {
                resourcePath: 'Orders',
                operation: 'Query'
            }
        }
    },
    'SFTP': {
        'Sender': {
            required: ['host', 'directory', 'credentialName'],
            optional: {
                'name': 'Display name',
                'filePattern': 'File pattern to match',
                'port': 'SFTP port'
            },
            example: {
                host: 'sftp.example.com',
                directory: '/incoming',
                credentialName: 'SFTP_Creds'
            }
        },
        'Receiver': {
            required: ['host', 'directory', 'fileName', 'credentialName'],
            optional: {
                'name': 'Display name',
                'port': 'SFTP port',
                'fileExists': 'Action when file exists'
            },
            example: {
                host: 'sftp.example.com',
                directory: '/outgoing',
                fileName: 'order.xml',
                credentialName: 'SFTP_Creds'
            }
        }
    },
    'SOAP': {
        'Sender': {
            required: [],
            optional: {
                'name': 'Display name',
                'address': 'SOAP endpoint address'
            },
            example: {
                address: '/soap/service'
            }
        },
        'Receiver': {
            required: [],
            optional: {
                'name': 'Display name',
                'url': 'SOAP service URL',
                'soapAction': 'SOAP action',
                'soapVersion': 'SOAP version (SOAP 1.1 or SOAP 1.2)'
            },
            example: {
                url: 'https://soap.example.com/service'
            }
        }
    },
    'IDoc': {
        'Sender': {
            required: ['address', 'credentialName'],
            optional: {
                'name': 'Display name'
            },
            example: {
                address: 'http://s4hana:44300/sap/bc/srt/idoc',
                credentialName: 'S4_Creds'
            }
        },
        'Receiver': {
            required: ['address', 'credentialName'],
            optional: {
                'name': 'Display name',
                'locationId': 'SAP Cloud Connector location ID',
                'sapMessageIdDetermination': 'Message ID determination strategy'
            },
            example: {
                address: 'http://s4hana:44300/sap/bc/srt/idoc?sap-client=100',
                credentialName: 'S4_Creds'
            }
        }
    }
};

/**
 * Map ComponentRegistry keys to ComponentType
 */
const REGISTRY_TO_TYPE: Record<string, ComponentType> = {
    'Enricher': 'ContentModifier',
    'Router': 'Router',
    'ScriptCollection': 'GroovyScript',
    'DBStorage': 'DataStore',
    'Multicast': 'Multicast',
    'GeneralSplitter': 'Splitter',
    'Gather': 'Gather',
    'MessageMapping': 'MessageMapping',
    'XmlValidator': 'XmlValidator',
    'XSLTMapping': 'XsltMapping',
    'ProcessCall': 'ProcessCall'
};

/**
 * Get capabilities information
 *
 * Returns metadata about all supported components, adapters, and their
 * configuration requirements. This data comes from the existing ComponentRegistry
 * and factory validation logic.
 *
 * @returns Capabilities object with components, adapters, and resources
 */
export function getCapabilities(): Capabilities {
    // Build component capabilities from registry
    const components: ComponentCapability[] = [];

    for (const [registryKey, definition] of Object.entries(ComponentRegistry)) {
        const componentType = REGISTRY_TO_TYPE[registryKey];
        if (!componentType) {
            continue; // Skip adapters like HTTPS
        }

        const requirements = COMPONENT_REQUIREMENTS[componentType];
        if (!requirements) {
            continue;
        }

        components.push({
            type: componentType,
            displayName: definition.displayName,
            requiredProperties: requirements.required,
            optionalProperties: requirements.optional,
            example: requirements.example,
            notes: requirements.notes
        });
    }

    // Build adapter capabilities
    const adapters: AdapterCapability[] = [];

    for (const adapterType of ['HTTP', 'HTTPS', 'OData', 'SFTP', 'SOAP', 'IDoc'] as AdapterType[]) {
        for (const direction of ['Sender', 'Receiver'] as AdapterDirection[]) {
            const requirements = ADAPTER_REQUIREMENTS[adapterType]?.[direction];
            if (!requirements) {
                continue;
            }

            adapters.push({
                type: adapterType,
                direction,
                displayName: `${adapterType} ${direction}`,
                requiredProperties: requirements.required,
                optionalProperties: requirements.optional,
                example: requirements.example
            });
        }
    }

    return {
        components,
        adapters,
        resources: ['groovy', 'mapping', 'xsd', 'xslt']
    };
}
