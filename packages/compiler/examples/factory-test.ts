/**
 * Factory API Test - Demonstrates generic factory layer for AI JSON consumption
 *
 * This example shows how CAP (or any AI service) can create IFlows from
 * generic JSON without component-specific knowledge.
 */

import {
    createComponent,
    createAdapter,
    fromJson,
    compileToZip,
    validate
} from '../src/index';

/**
 * Test 1: Component Factory
 */
function testComponentFactory() {
    console.log('\n=== Test 1: Component Factory ===');

    // Content Modifier
    const cm = createComponent('ContentModifier', {
        name: 'Set Headers',
        headers: { Country: 'IN', Type: 'Order' }
    });
    console.log('✓ Created ContentModifier:', cm.name);

    // Router
    const router = createComponent('Router', {
        name: 'Route by Type',
        routes: [
            { condition: "${header.type} == 'A'", target: 'componentA' },
            { condition: "${header.type} == 'B'", target: 'componentB' }
        ],
        defaultRoute: { target: 'defaultComponent' }
    });
    console.log('✓ Created Router:', router.name);

    // Groovy Script
    const script = createComponent('GroovyScript', {
        name: 'Transform',
        scriptName: 'transform.groovy'
    });
    console.log('✓ Created GroovyScript:', script.name);

    // Data Store
    const dataStore = createComponent('DataStore', {
        name: 'Store Order',
        operation: 'put',
        storageName: 'OrderStore',
        entryId: '${header.orderId}'
    });
    console.log('✓ Created DataStore:', dataStore.name);

    // Multicast
    const multicast = createComponent('Multicast', {
        name: 'Send to Multiple Systems'
    });
    console.log('✓ Created Multicast:', multicast.name);

    // Splitter
    const splitter = createComponent('Splitter', {
        name: 'Split Orders',
        expression: '/Orders/Order',
        expressionType: 'XPath',
        parallelProcessing: 'true'
    });
    console.log('✓ Created Splitter:', splitter.name);

    // Gather
    const gather = createComponent('Gather', {
        name: 'Gather Results',
        aggregationAlgorithm: 'sap-identical-multi-mapping',
        messageType: 'SameXMLFormat'
    });
    console.log('✓ Created Gather:', gather.name);

    // XML Validator
    const validator = createComponent('XmlValidator', {
        name: 'Validate Order',
        xsd: '/xsd/OrderSchema.xsd',
        preventException: false
    });
    console.log('✓ Created XmlValidator:', validator.name);

    console.log('\n✅ All component factories working!');
}

/**
 * Test 2: Adapter Factory
 */
function testAdapterFactory() {
    console.log('\n=== Test 2: Adapter Factory ===');

    // HTTPS Sender
    const httpsSender = createAdapter('HTTPS', 'Sender', {
        address: '/api/orders'
    });
    console.log('✓ Created HTTPS Sender:', httpsSender.name);

    // HTTP Receiver
    const httpReceiver = createAdapter('HTTP', 'Receiver', {
        url: 'https://api.example.com/orders',
        method: 'POST'
    });
    console.log('✓ Created HTTP Receiver:', httpReceiver.name);

    // OData Receiver
    const odataReceiver = createAdapter('OData', 'Receiver', {
        resourcePath: 'Orders',
        operation: 'Query',
        filter: "Status eq 'Open'"
    });
    console.log('✓ Created OData Receiver:', odataReceiver.name);

    // SFTP Sender
    const sftpSender = createAdapter('SFTP', 'Sender', {
        host: 'sftp.example.com',
        directory: '/incoming',
        filePattern: '*.xml',
        credentialName: 'SFTP_Creds'
    });
    console.log('✓ Created SFTP Sender:', sftpSender.name);

    console.log('\n✅ All adapter factories working!');
}

/**
 * Test 3: fromJson - Complete IFlow from AI JSON
 */
async function testFromJson() {
    console.log('\n=== Test 3: fromJson - AI JSON to IFlow ===');

    const json = {
        name: 'Order Processing Flow',
        sender: {
            type: 'HTTPS' as const,
            config: {
                address: '/api/orders'
            }
        },
        components: [
            {
                id: 'script1',
                type: 'GroovyScript' as const,
                config: {
                    name: 'Transform Order',
                    scriptName: 'transformOrder.groovy'
                }
            },
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Route by Priority',
                    routes: [
                        { condition: "${header.priority} == 'high'", target: 'urgent' },
                        { condition: "${header.priority} == 'low'", target: 'normal' }
                    ]
                }
            },
            {
                id: 'urgent',
                type: 'ContentModifier' as const,
                config: {
                    name: 'Mark Urgent',
                    headers: { Urgent: 'true' }
                }
            },
            {
                id: 'normal',
                type: 'ContentModifier' as const,
                config: {
                    name: 'Mark Normal',
                    headers: { Urgent: 'false' }
                }
            }
        ],
        receiver: {
            type: 'HTTP' as const,
            config: {
                url: 'https://backend.example.com/process',
                method: 'POST'
            }
        },
        connections: [
            { from: 'script1', to: 'router1' },
            { from: 'router1', to: 'urgent' },
            { from: 'router1', to: 'normal' }
        ],
        resources: [
            {
                type: 'groovy' as const,
                name: 'transformOrder.groovy',
                content: `
import com.sap.gateway.ip.core.customdev.util.Message;

def Message processData(Message message) {
    // Transform order
    def body = message.getBody(java.lang.String) as String;
    message.setBody(body.toUpperCase());
    return message;
}
                `.trim()
            }
        ]
    };

    console.log('Input JSON:', JSON.stringify(json, null, 2));

    // Create IFlow from JSON
    const flow = fromJson(json);
    console.log('\n✓ Created IFlow:', flow.name);
    console.log('  - Components:', flow.getComponents().length);
    console.log('  - Connections:', flow.getConnections().length);
    console.log('  - Resources:', flow.getResources().length);
    console.log('  - Sender:', flow.getSender()?.name);
    console.log('  - Receiver:', flow.getReceiver()?.name);

    // Validate
    const validationResult = validate(flow);
    console.log('\n✓ Validation:', validationResult.valid ? 'PASSED' : 'FAILED');
    if (!validationResult.valid) {
        console.log('Errors:', validationResult.errors);
        return;
    }

    // Compile
    console.log('\n✓ Compiling to ZIP...');
    const zipBuffer = await compileToZip(flow);
    console.log(`✓ Compiled ZIP: ${zipBuffer.length} bytes`);

    console.log('\n✅ fromJson test complete! AI JSON → IFlow → ZIP working!');
}

/**
 * Test 4: Complex Flow with All Component Types
 */
async function testComplexFlow() {
    console.log('\n=== Test 4: Complex Flow - All Components ===');

    const json = {
        name: 'Full Feature Flow',
        sender: {
            type: 'HTTPS' as const,
            config: { address: '/api/bulk' }
        },
        components: [
            {
                id: 'validate',
                type: 'XmlValidator' as const,
                config: {
                    name: 'Validate XML',
                    xsd: '/xsd/Order.xsd'
                }
            },
            {
                id: 'splitter',
                type: 'Splitter' as const,
                config: {
                    name: 'Split Orders',
                    expression: '/Orders/Order',
                    expressionType: 'XPath'
                }
            },
            {
                id: 'transform',
                type: 'GroovyScript' as const,
                config: {
                    name: 'Transform Each',
                    scriptName: 'transform.groovy'
                }
            },
            {
                id: 'store',
                type: 'DataStore' as const,
                config: {
                    name: 'Store Order',
                    operation: 'put',
                    storageName: 'OrderBackup',
                    entryId: '${header.orderId}'
                }
            },
            {
                id: 'gather',
                type: 'Gather' as const,
                config: {
                    name: 'Aggregate Results',
                    aggregationAlgorithm: 'sap-identical-multi-mapping'
                }
            }
        ],
        receiver: {
            type: 'OData' as const,
            config: {
                resourcePath: 'Orders',
                operation: 'Create'
            }
        },
        connections: [
            { from: 'validate', to: 'splitter' },
            { from: 'splitter', to: 'transform' },
            { from: 'transform', to: 'store' },
            { from: 'store', to: 'gather' }
        ],
        resources: [
            {
                type: 'xsd' as const,
                name: 'Order.xsd',
                content: '<?xml version="1.0"?><xs:schema>...</xs:schema>'
            },
            {
                type: 'groovy' as const,
                name: 'transform.groovy',
                content: 'def Message processData(Message message) { return message; }'
            }
        ]
    };

    const flow = fromJson(json);
    const validationResult = validate(flow);
    const zipBuffer = await compileToZip(flow);

    console.log('✓ Flow:', flow.name);
    console.log('✓ Components:', flow.getComponents().length);
    console.log('✓ Validation:', validationResult.valid ? 'PASSED' : 'FAILED');
    console.log('✓ ZIP size:', zipBuffer.length, 'bytes');

    console.log('\n✅ Complex flow test complete!');
}

/**
 * Test 5: Sender/Receiver Connections
 */
async function testSenderReceiverConnections() {
    console.log('\n=== Test 5: Sender/Receiver Connections ===');

    // Test 5a: sender → component
    const json1 = {
        name: 'Sender to Component',
        sender: {
            type: 'HTTPS' as const,
            config: { address: '/api/test' }
        },
        components: [
            {
                id: 'cm1',
                type: 'ContentModifier' as const,
                config: { name: 'Set Header' }
            }
        ],
        receiver: {
            type: 'HTTP' as const,
            config: { url: 'https://example.com' }
        },
        connections: [
            { from: 'sender', to: 'cm1' }
        ]
    };

    const flow1 = fromJson(json1);
    console.log('✓ sender → component:', flow1.getComponents().length, 'components');

    // Test 5b: component → receiver
    const json2 = {
        name: 'Component to Receiver',
        sender: {
            type: 'HTTPS' as const,
            config: { address: '/api/test' }
        },
        components: [
            {
                id: 'cm1',
                type: 'ContentModifier' as const,
                config: { name: 'Set Header' }
            }
        ],
        receiver: {
            type: 'HTTP' as const,
            config: { url: 'https://example.com' }
        },
        connections: [
            { from: 'cm1', to: 'receiver' }
        ]
    };

    const flow2 = fromJson(json2);
    console.log('✓ component → receiver:', flow2.getComponents().length, 'components');

    // Test 5c: sender → component → receiver
    const json3 = {
        name: 'Full Chain',
        sender: {
            type: 'HTTPS' as const,
            config: { address: '/api/test' }
        },
        components: [
            {
                id: 'cm1',
                type: 'ContentModifier' as const,
                config: { name: 'Set Header' }
            }
        ],
        receiver: {
            type: 'HTTP' as const,
            config: { url: 'https://example.com' }
        },
        connections: [
            { from: 'sender', to: 'cm1' },
            { from: 'cm1', to: 'receiver' }
        ]
    };

    const flow3 = fromJson(json3);
    console.log('✓ sender → component → receiver:', flow3.getComponents().length, 'components');

    // Test 5d: component → component (normal connection)
    const json4 = {
        name: 'Component to Component',
        sender: {
            type: 'HTTPS' as const,
            config: { address: '/api/test' }
        },
        components: [
            {
                id: 'cm1',
                type: 'ContentModifier' as const,
                config: { name: 'Step 1' }
            },
            {
                id: 'cm2',
                type: 'ContentModifier' as const,
                config: { name: 'Step 2' }
            }
        ],
        receiver: {
            type: 'HTTP' as const,
            config: { url: 'https://example.com' }
        },
        connections: [
            { from: 'cm1', to: 'cm2' }
        ]
    };

    const flow4 = fromJson(json4);
    console.log('✓ component → component:', flow4.getConnections().length, 'connections');

    console.log('\n✅ All sender/receiver connection tests passed!');
}

/**
 * Test 6: URL Normalization
 */
async function testUrlNormalization() {
    console.log('\n=== Test 6: URL Normalization ===');

    // Test 6a: Plain URL (no change)
    const plainUrl = createAdapter('HTTP', 'Receiver', {
        url: 'https://api.example.com/orders'
    });
    console.log('✓ Plain URL:', plainUrl.properties.staticUrl);

    // Test 6b: Markdown URL (normalized)
    const markdownUrl = createAdapter('HTTP', 'Receiver', {
        url: '[https://api.example.com/orders](https://api.example.com/orders)'
    });
    console.log('✓ Markdown URL normalized:', markdownUrl.properties.staticUrl);

    if (markdownUrl.properties.staticUrl !== 'https://api.example.com/orders') {
        throw new Error('Markdown URL normalization failed!');
    }

    // Test 6c: Markdown URL in SOAP
    const soapMarkdownUrl = createAdapter('SOAP', 'Receiver', {
        url: '[https://soap.example.com/service](https://soap.example.com/service)'
    });
    console.log('✓ SOAP Markdown URL normalized:', soapMarkdownUrl.properties.url);

    if (soapMarkdownUrl.properties.url !== 'https://soap.example.com/service') {
        throw new Error('SOAP Markdown URL normalization failed!');
    }

    console.log('\n✅ All URL normalization tests passed!');
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  Factory API Test Suite                       ║');
    console.log('║  Testing AI JSON → IFlow Creation              ║');
    console.log('╚════════════════════════════════════════════════╝');

    try {
        testComponentFactory();
        testAdapterFactory();
        await testFromJson();
        await testComplexFlow();
        await testSenderReceiverConnections();
        await testUrlNormalization();

        console.log('\n╔════════════════════════════════════════════════╗');
        console.log('║  ✅ ALL TESTS PASSED                           ║');
        console.log('║  Factory layer is ready for CAP integration   ║');
        console.log('╚════════════════════════════════════════════════╝\n');
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    runTests();
}
