/**
 * Regression test - End-to-end AI-generation scenarios for JDBC
 *
 * This does NOT modify the compiler. It exercises the exact path an AI/CAP
 * layer would use -- AI-facing generic JSON -> fromJson() -> validate() ->
 * compileToZip() -- for the two scenarios named in the JDBC task:
 *
 *   Scenario 1: "Read orders from a database using JDBC, validate them,
 *                transform the result and send them to S/4HANA."
 *   Scenario 2: "Receive an order, store/query customer information using
 *                JDBC, then continue processing."
 *
 * The JSON for each scenario is built ONLY from properties getCapabilities()
 * actually advertises (see [CAPS] section) -- nothing is invented beyond the
 * documented contract, matching how a CAP/AI layer is expected to generate
 * requests.
 */

import { fromJson, validate, compileToZip, getCapabilities, IFlowJson } from './src/index';
import { listZipEntries, readZipEntry, printZipTree } from './scripts/inspectZip';

let failures = 0;

function assert(condition: boolean, message: string): void {
    if (condition) {
        console.log(`  PASS: ${message}`);
    } else {
        console.error(`  FAIL: ${message}`);
        failures++;
    }
}

function checkNoDuplicateComponentIds(flow: ReturnType<typeof fromJson>): void {
    const ids = flow.getComponents().map(c => c.id);
    assert(new Set(ids).size === ids.length, `no duplicate component IDs (${ids.length} components, ${new Set(ids).size} unique)`);
}

function checkNoDuplicatedResourcePaths(entries: string[]): void {
    const doubled = entries.filter(e => /\/(xsd\/xsd|mapping\/mapping|script\/script)\//.test(e) || /^(xsd\/xsd|mapping\/mapping|script\/script)\//.test(e));
    assert(doubled.length === 0, `no doubled resource directory prefixes (found: ${JSON.stringify(doubled)})`);
}

async function main() {
    console.log('=== End-to-End AI-Generation Regression: JDBC scenarios ===\n');

    // ------------------------------------------------------------------
    // [CAPS] Confirm getCapabilities() exposes only the JDBC properties
    // actually implemented by JdbcAdapter/JdbcCall (no more, no less).
    // This is the reference the AI JSON below is built against.
    // ------------------------------------------------------------------
    console.log('[CAPS] getCapabilities() JDBC surface');
    const caps = getCapabilities();

    const EXPECTED_JDBC_PROPS = new Set([
        'name', 'dataSourceAlias', 'system', 'connectionTimeout',
        'queryTimeout', 'maxRecords', 'batchMode', 'batchOperation'
    ]);

    const jdbcCallCap = caps.components.find(c => c.type === 'JdbcCall');
    const jdbcCallProps = new Set([...(jdbcCallCap?.requiredProperties || []), ...Object.keys(jdbcCallCap?.optionalProperties || {})]);
    console.log('  JdbcCall properties:', [...jdbcCallProps].sort());
    assert(!!jdbcCallCap, 'capabilities.components includes JdbcCall');
    assert(jdbcCallCap?.requiredProperties.join(',') === 'dataSourceAlias', 'JdbcCall.requiredProperties is exactly ["dataSourceAlias"]');
    assert(
        jdbcCallProps.size === EXPECTED_JDBC_PROPS.size && [...jdbcCallProps].every(p => EXPECTED_JDBC_PROPS.has(p)),
        `JdbcCall exposes exactly the implemented property set (no invented/extra properties): ${[...jdbcCallProps].sort().join(', ')}`
    );

    const jdbcAdapterReceiverCap = caps.adapters.find(a => a.type === 'JDBC' && a.direction === 'Receiver');
    const jdbcAdapterSenderCap = caps.adapters.find(a => a.type === 'JDBC' && a.direction === 'Sender');
    const jdbcAdapterProps = new Set([...(jdbcAdapterReceiverCap?.requiredProperties || []), ...Object.keys(jdbcAdapterReceiverCap?.optionalProperties || {})]);
    assert(!!jdbcAdapterReceiverCap, 'capabilities.adapters includes JDBC/Receiver');
    assert(!jdbcAdapterSenderCap, 'capabilities.adapters does NOT include JDBC/Sender (matches JdbcAdapter, which is receiver-only)');
    assert(
        jdbcAdapterProps.size === EXPECTED_JDBC_PROPS.size && [...jdbcAdapterProps].every(p => EXPECTED_JDBC_PROPS.has(p)),
        `JDBC/Receiver adapter capability exposes exactly the implemented property set: ${[...jdbcAdapterProps].sort().join(', ')}`
    );

    // ==================================================================
    // SCENARIO 1: "Read orders from a database using JDBC, validate
    // them, transform the result and send them to S/4HANA."
    // ==================================================================
    console.log('\n\n=== SCENARIO 1: Read orders via JDBC -> validate -> transform -> S/4HANA ===\n');

    const ORDER_SCHEMA_XSD = `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Orders"><xs:complexType><xs:sequence><xs:element name="Order" maxOccurs="unbounded"><xs:complexType><xs:sequence><xs:element name="OrderId" type="xs:string"/><xs:element name="Status" type="xs:string"/></xs:sequence></xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element></xs:schema>`;
    const ORDER_TO_S4_MMAP = `<?xml version="1.0" encoding="UTF-8"?><MapRoot xmlns="urn:com.sap.aii.mdt.mm.mapping"><MappingProgram/></MapRoot>`;

    // Step 1: AI-facing generic JSON, built only from documented properties.
    const scenario1Json: IFlowJson = {
        name: 'Read Orders via JDBC to S4HANA',
        sender: {
            type: 'HTTPS',
            config: { address: '/trigger/read-orders' }
        },
        components: [
            {
                id: 'setOrderQuery',
                type: 'ContentModifier',
                config: {
                    name: 'Set Order Query',
                    bodyType: 'constant',
                    wrapContent: "SELECT ORDER_ID, STATUS FROM ORDERS WHERE STATUS = 'NEW'"
                }
            },
            {
                id: 'readOrdersDb',
                type: 'JdbcCall',
                config: {
                    name: 'Read Orders DB',
                    dataSourceAlias: 'ORDERS_DB',
                    queryTimeout: 30,
                    connectionTimeout: 30,
                    maxRecords: 1000
                }
            },
            {
                id: 'validateOrders',
                type: 'XmlValidator',
                config: {
                    name: 'Validate Orders',
                    xsd: 'OrderSchema.xsd'
                }
            },
            {
                id: 'transformToS4',
                type: 'MessageMapping',
                config: {
                    name: 'Transform Orders to S4HANA Format',
                    mappingName: 'OrderToS4Mapping'
                }
            }
        ],
        connections: [
            { from: 'sender', to: 'setOrderQuery' },
            { from: 'setOrderQuery', to: 'readOrdersDb' },
            { from: 'readOrdersDb', to: 'validateOrders' },
            { from: 'validateOrders', to: 'transformToS4' },
            { from: 'transformToS4', to: 'receiver' }
        ],
        receiver: {
            type: 'SOAP',
            config: {
                name: 'Send to S4HANA',
                url: 'https://s4hana.example.com/sap/bc/srt/rfc/sap/orders_in',
                soapAction: 'http://sap.com/xi/WebService/orders_in',
                credentialName: 'S4HANA_Creds'
            }
        },
        resources: [
            { type: 'xsd', name: 'OrderSchema.xsd', content: ORDER_SCHEMA_XSD },
            { type: 'mapping', name: 'OrderToS4Mapping.mmap', content: ORDER_TO_S4_MMAP }
        ]
    };

    console.log('[1] AI-facing JSON:');
    console.log(JSON.stringify(scenario1Json, null, 2));

    // Step 2: fromJson()
    console.log('\n[2] fromJson()');
    let flow1: ReturnType<typeof fromJson> | undefined;
    let flow1Threw: unknown = null;
    try {
        flow1 = fromJson(scenario1Json);
    } catch (err) {
        flow1Threw = err;
    }
    assert(flow1Threw === null, `fromJson() does not throw${flow1Threw ? ` (threw: ${(flow1Threw as Error).message})` : ''}`);
    if (!flow1) throw new Error('Scenario 1: fromJson() failed, cannot continue');

    // Step 3: validate()
    console.log('\n[3] validate()');
    const validation1 = validate(flow1);
    console.log('  Result:', JSON.stringify(validation1));
    assert(validation1.valid, 'validate().valid === true');
    assert(validation1.errors.length === 0, 'no validation errors');

    // CP-001 / duplicate ID check (requirement 7)
    checkNoDuplicateComponentIds(flow1);
    const dup1 = validation1.errors.filter(e => e.code === 'CP-001');
    assert(dup1.length === 0, 'validate() reports no CP-001 duplicate ID errors');

    // Step 4: compileToZip()
    console.log('\n[4] compileToZip()');
    const zip1 = await compileToZip(flow1);
    assert(zip1.length > 0, 'ZIP buffer generated and non-empty');

    const entries1 = printZipTree(zip1, 'Scenario 1 ZIP');
    checkNoDuplicatedResourcePaths(entries1);
    assert(entries1.includes('src/main/resources/xsd/OrderSchema.xsd'), 'XSD resource packaged at src/main/resources/xsd/OrderSchema.xsd (not doubled)');
    assert(entries1.includes('src/main/resources/mapping/OrderToS4Mapping.mmap'), 'mapping resource packaged at src/main/resources/mapping/OrderToS4Mapping.mmap (not doubled)');

    // Step 5/6: inspect .iflw, confirm JDBC representation
    const iflwName1 = entries1.find(e => e.endsWith('.iflw'))!;
    const iflw1 = readZipEntry(zip1, iflwName1).toString('utf-8');

    console.log('\n[5/6] Generated .iflw JDBC structure');
    const serviceTaskMatch1 = iflw1.match(/<bpmn2:serviceTask id="readOrdersDb"[\s\S]*?<\/bpmn2:serviceTask>/);
    assert(!!serviceTaskMatch1, 'iflw contains <serviceTask id="readOrdersDb"> for the JdbcCall step');
    assert(!!serviceTaskMatch1 && serviceTaskMatch1[0].includes('<key>activityType</key>') && serviceTaskMatch1[0].includes('<value>ExternalCall</value>'), 'serviceTask has activityType=ExternalCall');
    assert(!!serviceTaskMatch1 && serviceTaskMatch1[0].includes('ctype::FlowstepVariant/cname::ExternalCall/version::1.0.4'), 'serviceTask has the correct ExternalCall cmdVariantUri');

    const jdbcMessageFlowMatch1 = iflw1.match(/<bpmn2:messageFlow id="[^"]+" name="JDBC" sourceRef="readOrdersDb" targetRef="([^"]+)">([\s\S]*?)<\/bpmn2:messageFlow>/);
    assert(!!jdbcMessageFlowMatch1, 'iflw contains a JDBC messageFlow sourced from readOrdersDb');
    if (jdbcMessageFlowMatch1) {
        const body = jdbcMessageFlowMatch1[2];
        assert(body.includes('<key>ComponentType</key>') && body.includes('<value>JDBC</value>'), 'JDBC messageFlow has ComponentType=JDBC');
        assert(body.includes('<key>alias</key>') && body.includes('<value>ORDERS_DB</value>'), 'JDBC messageFlow carries dataSourceAlias (alias=ORDERS_DB)');
        assert(body.includes('<key>queryTimeout</key>') && body.includes('<value>30</value>'), 'JDBC messageFlow carries queryTimeout=30');
        assert(body.includes('<key>pageSize</key>') && body.includes('<value>1000</value>'), 'JDBC messageFlow carries pageSize=1000 (maxRecords)');
        assert(body.includes('direction::Receiver'), 'JDBC messageFlow cmdVariantUri direction is Receiver');
        const participantId = jdbcMessageFlowMatch1[1];
        assert(iflw1.includes(`<bpmn2:participant id="${participantId}" ifl:type="EndpointRecevier"`), `JDBC messageFlow targets an EndpointRecevier participant (${participantId})`);
    }

    // Confirm the surrounding non-JDBC components are present and intact
    // (requirement 9: existing non-JDBC components still compile alongside JDBC)
    assert(iflw1.includes('<bpmn2:callActivity id="setOrderQuery"'), 'ContentModifier (setOrderQuery) present as callActivity');
    // XML-escaped: PropertyWriter/CallActivityWriter escape ' as &apos; (correct,
    // consistent XML escaping) -- match on the escaped form, not the raw string.
    assert(iflw1.includes("SELECT ORDER_ID, STATUS FROM ORDERS WHERE STATUS = &apos;NEW&apos;"), 'ContentModifier carries the SQL query text (wrapContent, XML-escaped)');
    assert(iflw1.includes('name="Validate Orders"') && iflw1.includes('<value>XmlValidator</value>'), 'XmlValidator (Validate Orders) present');
    assert(iflw1.includes('/xsd/OrderSchema.xsd'), 'XmlValidator xsd property resolves to /xsd/OrderSchema.xsd (matches packaged path)');
    assert(iflw1.includes('name="Transform Orders to S4HANA Format"') && iflw1.includes('<value>Mapping</value>'), 'MessageMapping (Transform Orders to S4HANA Format) present');
    assert(iflw1.includes('OrderToS4Mapping'), 'MessageMapping references OrderToS4Mapping');
    assert(iflw1.includes('name="SOAP"') || iflw1.includes('<value>SOAP</value>'), 'SOAP receiver (S/4HANA) present in collaboration');

    // ------------------------------------------------------------------
    // FINDING (pre-existing, NOT a JDBC defect -- see final report):
    // ComponentFactory.createComponent() does not forward the AI-supplied
    // `id` to XmlValidator/MessageMapping (also true for Multicast,
    // Splitter, Gather, XsltMapping). Those constructors don't accept an
    // `id` parameter at all, so each falls back to its own
    // `Date.now()`-based id, silently discarding "validateOrders" /
    // "transformToS4" in favor of an internal id like "XmlValidator_...".
    // Sequence flows still wire correctly (fromJson's componentMap keys
    // by the AI id and connects by object reference, not by the emitted
    // BPMN id), so this does not break THIS test's flow topology or
    // validation -- but it is the same class of bug fixed for ProcessCall
    // (CP-001) and remains latent for these 6 component types: two
    // instances of the same type created within the same millisecond
    // would still collide. JdbcCall itself is unaffected (it does accept
    // and preserve `id`, verified above and in test-jdbc-regression.ts).
    // ------------------------------------------------------------------
    const emittedXmlValidatorId = iflw1.match(/<bpmn2:callActivity id="([^"]+)" name="Validate Orders">/)?.[1];
    const emittedMappingId = iflw1.match(/<bpmn2:callActivity id="([^"]+)" name="Transform Orders to S4HANA Format">/)?.[1];
    console.log(`  FINDING (pre-existing, non-JDBC): AI id "validateOrders" was NOT preserved in the emitted BPMN -- got id="${emittedXmlValidatorId}" instead (ComponentFactory does not forward id to XmlValidator's constructor).`);
    console.log(`  FINDING (pre-existing, non-JDBC): AI id "transformToS4" was NOT preserved in the emitted BPMN -- got id="${emittedMappingId}" instead (ComponentFactory does not forward id to MessageMapping's constructor).`);

    // ==================================================================
    // SCENARIO 2: "Receive an order, store/query customer information
    // using JDBC, then continue processing."
    // ==================================================================
    console.log('\n\n=== SCENARIO 2: Receive order -> query customer via JDBC -> continue processing ===\n');

    const scenario2Json: IFlowJson = {
        name: 'Receive Order Query Customer JDBC',
        sender: {
            type: 'HTTPS',
            config: { address: '/orders/receive' }
        },
        components: [
            {
                id: 'setCustomerQuery',
                type: 'ContentModifier',
                config: {
                    name: 'Set Customer Query',
                    bodyType: 'constant',
                    wrapContent: 'SELECT CUSTOMER_ID, NAME, CREDIT_LIMIT FROM CUSTOMERS WHERE CUSTOMER_ID = ${header.customerId}'
                }
            },
            {
                id: 'queryCustomerDb',
                type: 'JdbcCall',
                config: {
                    name: 'Query Customer Info',
                    dataSourceAlias: 'CUSTOMER_DB'
                }
            },
            {
                id: 'enrichOrder',
                type: 'ContentModifier',
                config: {
                    name: 'Merge Customer Info Into Order',
                    bodyType: 'expression'
                }
            },
            {
                id: 'continueProcessing',
                type: 'GroovyScript',
                config: {
                    name: 'Continue Order Processing',
                    scriptName: 'continueProcessing.groovy'
                }
            }
        ],
        connections: [
            { from: 'sender', to: 'setCustomerQuery' },
            { from: 'setCustomerQuery', to: 'queryCustomerDb' },
            { from: 'queryCustomerDb', to: 'enrichOrder' },
            { from: 'enrichOrder', to: 'continueProcessing' },
            { from: 'continueProcessing', to: 'receiver' }
        ],
        receiver: {
            type: 'HTTPS',
            config: { url: 'https://downstream.example.com/orders', method: 'POST' }
        },
        resources: [
            { type: 'groovy', name: 'continueProcessing.groovy', content: 'Message processData(Message message) { return message }' }
        ]
    };

    console.log('[1] AI-facing JSON:');
    console.log(JSON.stringify(scenario2Json, null, 2));

    console.log('\n[2] fromJson()');
    let flow2: ReturnType<typeof fromJson> | undefined;
    let flow2Threw: unknown = null;
    try {
        flow2 = fromJson(scenario2Json);
    } catch (err) {
        flow2Threw = err;
    }
    assert(flow2Threw === null, `fromJson() does not throw${flow2Threw ? ` (threw: ${(flow2Threw as Error).message})` : ''}`);
    if (!flow2) throw new Error('Scenario 2: fromJson() failed, cannot continue');

    console.log('\n[3] validate()');
    const validation2 = validate(flow2);
    console.log('  Result:', JSON.stringify(validation2));
    assert(validation2.valid, 'validate().valid === true');
    assert(validation2.errors.length === 0, 'no validation errors');

    checkNoDuplicateComponentIds(flow2);
    const dup2 = validation2.errors.filter(e => e.code === 'CP-001');
    assert(dup2.length === 0, 'validate() reports no CP-001 duplicate ID errors');

    console.log('\n[4] compileToZip()');
    const zip2 = await compileToZip(flow2);
    assert(zip2.length > 0, 'ZIP buffer generated and non-empty');

    const entries2 = printZipTree(zip2, 'Scenario 2 ZIP');
    checkNoDuplicatedResourcePaths(entries2);
    assert(entries2.includes('src/main/resources/script/continueProcessing.groovy'), 'groovy resource packaged at src/main/resources/script/continueProcessing.groovy (not doubled)');

    const iflwName2 = entries2.find(e => e.endsWith('.iflw'))!;
    const iflw2 = readZipEntry(zip2, iflwName2).toString('utf-8');

    console.log('\n[5/6] Generated .iflw JDBC structure');
    const serviceTaskMatch2 = iflw2.match(/<bpmn2:serviceTask id="queryCustomerDb"[\s\S]*?<\/bpmn2:serviceTask>/);
    assert(!!serviceTaskMatch2, 'iflw contains <serviceTask id="queryCustomerDb"> for the JdbcCall step');

    const jdbcMessageFlowMatch2 = iflw2.match(/<bpmn2:messageFlow id="[^"]+" name="JDBC" sourceRef="queryCustomerDb" targetRef="([^"]+)">([\s\S]*?)<\/bpmn2:messageFlow>/);
    assert(!!jdbcMessageFlowMatch2, 'iflw contains a JDBC messageFlow sourced from queryCustomerDb');
    if (jdbcMessageFlowMatch2) {
        const body = jdbcMessageFlowMatch2[2];
        assert(body.includes('<key>alias</key>') && body.includes('<value>CUSTOMER_DB</value>'), 'JDBC messageFlow carries dataSourceAlias (alias=CUSTOMER_DB)');
        // Defaults applied when not specified in the AI JSON (requirement:
        // confirm defaults come from JdbcAdapter, not invented ad hoc)
        assert(body.includes('<key>queryTimeout</key>') && body.includes('<value>60</value>'), 'JDBC messageFlow defaults queryTimeout to 60 when unspecified');
        assert(body.includes('<key>pageSize</key>') && body.includes('<value>100</value>'), 'JDBC messageFlow defaults pageSize to 100 when unspecified');
    }

    // "then continue processing" -- confirm flow continues past the JDBC
    // call through ordinary components to the receiver (requirement 9).
    assert(iflw2.includes('<bpmn2:callActivity id="enrichOrder"'), 'ContentModifier (enrichOrder) present after JDBC call');
    assert(iflw2.includes('<bpmn2:callActivity id="continueProcessing"') && iflw2.includes('<value>Script</value>'), 'GroovyScript (continueProcessing) present after JDBC call');
    const seqFromJdbc = iflw2.match(/<bpmn2:sequenceFlow[^>]*sourceRef="queryCustomerDb"[^>]*targetRef="([^"]+)"/);
    assert(!!seqFromJdbc && seqFromJdbc[1] === 'enrichOrder', 'sequence flow continues from JDBC step into subsequent processing (queryCustomerDb -> enrichOrder)');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
