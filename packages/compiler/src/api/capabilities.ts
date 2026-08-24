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
            'bodyType': 'Body modification type -- "constant" or "expression" (case-insensitive, normalized to lowercase). Omit if this Content Modifier only sets headers/properties and should leave the body untouched.',
            'propertyTable': 'SAP\'s "<row>...</row>"-encoded exchange-property assignment table (string). Leave unset if not setting properties.',
            'headerTable': 'SAP\'s "<row>...</row>"-encoded header assignment table (string). Leave unset if not setting headers.',
            'wrapContent': 'The actual message body content/expression to set (string) -- required for bodyType to have any effect. NOT a boolean flag.'
        },
        example: {
            name: 'Set Country Header'
        },
        notes: 'bodyType must be "constant" (wrapContent is a literal string) or "expression" (wrapContent is a SAP simple-expression string, e.g. "${header.orderId}") -- any other value, or a non-string wrapContent/propertyTable/headerTable, is rejected rather than silently accepted, since that previously produced a Content Modifier step SAP shows as unconfigured ("Modifies incoming message with additional information") instead of actually running.'
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
            processId: 'dataLookupProcess'
        },
        notes: 'Invokes a Local Integration Process declared in the SAME iFlow -- NOT another integration flow (use ProcessDirectCall for that). `processId` must match the `id` of an entry in the top-level "subProcesses" array (falls back to that entry\'s "name" if no "id" was given); fromJson() resolves this reference automatically to the real generated process id. A `processId` that does not match any declared subProcess fails validate() with PC-001 ("Local Integration Process does not exist") rather than silently producing a ZIP SAP will reject on import. Example: { "subProcesses": [{ "id": "dataLookupProcess", "name": "Data Lookup", "components": [...], "connections": [...] }] } alongside a ProcessCall component with processId: "dataLookupProcess".'
    },
    'JdbcCall': {
        required: ['dataSourceAlias'],
        optional: {
            'name': 'Display name for the component',
            'system': 'Name of the receiver system shown in the collaboration diagram (defaults to name)',
            'connectionTimeout': 'Connection Timeout, in seconds (default: 60)',
            'queryTimeout': 'Query/Response Timeout, in seconds (default: 60)',
            'maxRecords': 'Maximum Records to return (default: 100)',
            'batchMode': 'Whether statements are executed as a batch (default: false)',
            'batchOperation': '"atomic" or "notAtomic" (default: "atomic")'
        },
        example: {
            name: 'Query Orders DB',
            dataSourceAlias: 'ORDERS_DB'
        },
        notes: 'Mid-flow request-reply call to a database via JDBC (SAP CPI has no JDBC sender -- it is always called mid-flow, never used as the flow\'s sender). The SQL statement is NOT a property of this component: it is the message body at the time of the call. Always connect a preceding ContentModifier (with wrapContent set to the SQL) into this component. Multiple JdbcCall instances are supported in the same flow -- give each an explicit, unique "id" in the components array so results/errors can be traced back to a specific call. Unsupported properties are rejected, not silently ignored.'
    },
    'ProcessDirectCall': {
        required: ['address'],
        optional: {
            'name': 'Display name for the component',
            'system': 'Name of the connected system shown in the collaboration diagram (defaults to name)'
        },
        example: {
            name: 'Call Domestic Order Flow',
            address: '/process/domestic-orders'
        },
        notes: 'Mid-flow request-reply call to ANOTHER integration flow via the Process Direct adapter (in-memory, same tenant, no network hop) -- the target flow must expose a matching Process Direct Sender at the same "address". Unlike JdbcCall, this has no query/body requirement: the current message is simply passed to the target flow, and processing continues with whatever it returns. `address` must be a relative path beginning with "/" (e.g. "/process/domestic-orders") and must match the target flow\'s Process Direct Sender address exactly. Multiple ProcessDirectCall instances are supported in the same flow -- give each an explicit, unique "id". Unsupported properties are rejected, not silently ignored.'
    },
    'RFC': {
        // RFC is NOT a real component type -- it has no mid-flow BPMN
        // representation in SAP Cloud Integration (evidence:
        // rfc_reference.zip shows it is always the flow's own receiver
        // adapter, never a serviceTask/callActivity). This entry exists
        // only so `ComponentType` (which includes 'RFC' purely so
        // fromJson() can recognize and correct the common mistake of
        // declaring it as a components[] entry -- see
        // ComponentFactory.normalizeRfcComponents()) type-checks. It is
        // NEVER present in getCapabilities().components, because that list
        // is built from ComponentRegistry entries and RFC intentionally has
        // none. Use the 'RFC' entry under capabilities.adapters (Receiver
        // direction) instead -- declare it as
        // `receiver: { type: "RFC", config: {...} }`, not as a component.
        required: [],
        optional: {},
        notes: 'Not a real component -- see capabilities.adapters for "RFC" (Receiver only). If an RFC entry appears in "components", fromJson() automatically treats it as the flow\'s receiver instead.'
    },
    'JMS': {
        // JMS is NOT a real component type -- it has no mid-flow BPMN
        // representation in SAP Cloud Integration either (evidence:
        // jms_reference.zip shows both its Sender and Receiver as
        // flow-level messageFlows, never a serviceTask/callActivity). This
        // entry exists only so `ComponentType` type-checks; it is NEVER
        // present in getCapabilities().components (that list is built from
        // ComponentRegistry entries, and JMS intentionally has none). Use
        // the 'JMS' entries under capabilities.adapters (Sender AND
        // Receiver) instead -- declare it as `sender`/`receiver: { type:
        // "JMS", config: {...} }`, not as a component.
        required: [],
        optional: {},
        notes: 'Not a real component -- see capabilities.adapters for "JMS" (Sender and Receiver). Calling createComponent(\'JMS\', ...) directly throws a clear error explaining this.'
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
    },
    'JDBC': {
        // No 'Sender' entry: SAP CPI has no JDBC sender direction. Prefer
        // the 'JdbcCall' component (mid-flow, supports multiple instances)
        // over this flow-level receiver, which only covers a single JDBC
        // call at the very end of the flow.
        'Receiver': {
            required: ['dataSourceAlias'],
            optional: {
                'name': 'Display name',
                'system': 'Name of the receiver system shown in the collaboration diagram',
                'connectionTimeout': 'Connection Timeout, in seconds (default: 60)',
                'queryTimeout': 'Query/Response Timeout, in seconds (default: 60)',
                'maxRecords': 'Maximum Records to return (default: 100)',
                'batchMode': 'Whether statements are executed as a batch (default: false)',
                'batchOperation': '"atomic" or "notAtomic" (default: "atomic")'
            },
            example: {
                dataSourceAlias: 'ORDERS_DB'
            }
        }
    } as any,
    'ProcessDirect': {
        // Unlike JDBC, Process Direct genuinely has both directions in real
        // SAP exports: Sender exposes this flow to be called by another
        // flow; Receiver calls out to another flow. Prefer the
        // 'ProcessDirectCall' component for the mid-flow, multi-instance
        // Receiver case -- this flow-level entry only covers a single call.
        'Sender': {
            required: ['address'],
            optional: {
                'name': 'Display name',
                'system': 'Name of the connected system shown in the collaboration diagram'
            },
            example: {
                address: '/process/orders'
            }
        },
        'Receiver': {
            required: ['address'],
            optional: {
                'name': 'Display name',
                'system': 'Name of the connected system shown in the collaboration diagram'
            },
            example: {
                address: '/process/orders'
            }
        }
    },
    'RFC': {
        // No 'Sender' entry: SAP CPI has no RFC sender direction -- RFC is
        // always a synchronous, outbound-only call from Cloud Integration
        // into an SAP system's remote-enabled function module.
        'Receiver': {
            required: ['destination'],
            optional: {
                'name': 'Display name',
                'system': 'Name of the receiver system shown in the collaboration diagram (defaults to name)',
                'transactioncommit': 'Whether to send a confirm transaction (SAP UI label: "Send Confirm Transaction", default: false)',
                'newConnection': 'Whether to always create a new RFC connection (SAP UI label: "Create New Connection", default: false)'
            },
            example: {
                destination: 'S4_RFC_DEST'
            }
        }
    } as any,
    'JMS': {
        // Unlike RFC/JDBC, JMS genuinely has both directions in the real
        // SAP export (jms_reference.zip): Sender consumes from a queue to
        // trigger the flow; Receiver sends the current message to a queue.
        'Sender': {
            required: ['queueName'],
            optional: {
                'name': 'Display name',
                'system': 'Name of the sender system shown in the collaboration diagram (defaults to name)',
                'numberConcurrentProcesses': 'Number of concurrent processes consuming the queue (default: 1)',
                'maxRetryInterval': 'Maximum retry interval in seconds (default: 60)',
                'useDeadLetterQueue': 'Whether to use a dead letter queue on failure (default: true)',
                'exponentialBackoff': 'Whether to use exponential backoff between retries (default: true)',
                'retryInterval': 'Retry interval in seconds (default: 1)'
            },
            example: {
                queueName: 'IDocProcessing'
            }
        },
        'Receiver': {
            required: ['queueName'],
            optional: {
                'name': 'Display name',
                'system': 'Name of the receiver system shown in the collaboration diagram (defaults to name)',
                'useMessageCompression': 'Whether to compress the message before sending (default: true)',
                'encryptMessage': 'Whether to encrypt the message before sending (default: true)',
                'retentionThresholdAlerting': 'Retention threshold alerting, in days (default: 2)',
                'expirationPeriod': 'Message expiration period, in days (default: 30)',
                'transferExchangeProperties': 'Whether to transfer exchange properties onto the JMS message (default: true)'
            },
            example: {
                queueName: 'IDocProcessing'
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
    'ProcessCall': 'ProcessCall',
    'JdbcCall': 'JdbcCall',
    'ProcessDirectCall': 'ProcessDirectCall'
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

    for (const adapterType of ['HTTP', 'HTTPS', 'OData', 'SFTP', 'SOAP', 'IDoc', 'JDBC', 'ProcessDirect', 'RFC', 'JMS'] as AdapterType[]) {
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
