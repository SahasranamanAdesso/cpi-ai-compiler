import { IFlow } from '../model/IFlow';

/**
 * ExternalizedParameters - detects "{{ParamName}}" placeholder values in
 * adapter properties and produces the SAP-required parameter registration
 * data (parameters.prop entry + parameters.propdef <parameter>/<reference>
 * entries) so the placeholder actually functions as a real SAP Integration
 * Suite externalized parameter, not just literal template text sitting in
 * the .iflw with nothing backing it.
 *
 * Root cause this fixes (revised -- see "IMPORTANT CORRECTION" below): a
 * "{{...}}"-shaped property value written directly into a messageFlow's
 * <ifl:property> satisfies SAP's XML schema (the attribute is non-empty),
 * but SAP Integration Suite's design-time validator does NOT stop there --
 * it resolves the placeholder against parameters.prop and validates the
 * RESOLVED value. Externalizing a field (registering it in
 * parameters.propdef's <param_references>) never exempts it from needing a
 * real value; it only makes that value swappable later via SAP's Configure
 * > Externalized Parameters screen. This was confirmed directly:
 * amqp_reference.zip's parameters.prop has REAL values for every one of its
 * externalized parameters (EMHOST=enterprise-messaging-...,
 * EMPORT=443, EMUser=EventMesh_Oauth, ...) -- none are blank.
 *
 * IMPORTANT CORRECTION: an earlier version of this fix registered each
 * placeholder correctly (<parameter>/<reference> entries) but wrote an
 * EMPTY default value ("KEY=") to parameters.prop, on the theory that
 * externalization alone would make SAP skip the field's mandatory/format
 * check. That theory was directly falsified by a live SAP Integration
 * Suite import: with the parameter correctly registered but resolving to
 * an empty string, SAP still reported "Attribute 'Host' is mandatory",
 * "Enter a value between 1 and 65535", etc. -- because it validates the
 * RESOLVED value, not just whether a <reference> exists. The fix now
 * writes a clearly-fake, non-empty, format-valid DEFAULT value for each
 * parameter (see AMQP_PLACEHOLDER_DEFAULTS below) -- e.g.
 * "your-event-mesh-host.example.com" for host, "443" for port (the one
 * universal, non-tenant-specific value already confirmed by evidence),
 * "REPLACE_WITH_CREDENTIAL_NAME"/"REPLACE_WITH_QUEUE_NAME" for the two
 * genuinely tenant-specific string fields -- never a real company's actual
 * infrastructure or credential, but always non-empty and shaped correctly,
 * satisfying SAP's validation while still being obviously a placeholder for
 * the user to replace after import.
 *
 * SCOPE: only adapter types this compiler has real parameters.propdef
 * evidence for get parameters registered here (currently: AMQP only, from
 * amqp_reference.zip). Every other adapter type's properties are left
 * completely untouched -- a "{{...}}"-shaped value in, say, an HttpAdapter
 * or JdbcAdapter property is still written through as a literal string with
 * no parameter registered, exactly as before this change. This is
 * deliberate: guessing the registration format for an adapter type this
 * compiler has no propdef evidence for would be inventing structure, not
 * reproducing it. Confirmed evidence (RFC/JMS/ProcessDirect reference
 * exports) shows a DIFFERENT attribute_id format
 * (`ctype::AdapterVariant/cname::.../attrId::x`) than AMQP's own evidenced
 * short form (`/attrId::x`) -- these are not interchangeable, so extending
 * this mechanism to another adapter type requires that adapter's own
 * propdef evidence, not reuse of AMQP's shape.
 */

export interface ExternalizedParameter {
    /** The parameter name inside "{{...}}", e.g. "EMHOST" -- becomes parameters.prop's key and parameters.propdef's <name>. */
    paramKey: string;
    /** SAP xsd type for the <type> element. */
    xsdType: 'string' | 'integer' | 'boolean';
    /** attribute_category on the <reference> element -- the adapter's own "system" display name (evidence: "EventMesh"). */
    attributeCategory: string;
    /** attribute_id on the <reference> element (evidence: AMQP uses the short "/attrId::propertyName" form). */
    attributeId: string;
    /**
     * The value written to parameters.prop for this parameter. Always a
     * non-empty, format-valid, clearly-fake placeholder -- never a real
     * company's infrastructure/credential (see module doc for why an empty
     * value does not work).
     */
    defaultValue: string;
}

const PLACEHOLDER_PATTERN = /^\{\{(.+)\}\}$/;

/**
 * Extracts the parameter name from a "{{ParamName}}"-shaped value, or
 * undefined if the value isn't placeholder-shaped.
 */
export function extractPlaceholderKey(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const match = value.trim().match(PLACEHOLDER_PATTERN);
    return match ? match[1] : undefined;
}

/**
 * AMQP property -> SAP xsd type. Evidence: amqp_reference.zip
 * parameters.propdef's 13 <parameter> entries for the EventMesh-category
 * attributes (attribute_category="EventMesh"/"EventMesh.Auth").
 */
const AMQP_PROPERTY_TYPES: Record<string, 'string' | 'integer' | 'boolean'> = {
    destinationName: 'string',
    host: 'string',
    port: 'integer',
    path: 'string',
    authentication: 'string',
    credentialName: 'string',
    connectWithTLS: 'boolean',
    disableReplyTo: 'boolean',
    NumberConcurrentProcesses: 'integer',
    maxRetries: 'integer',
    queuePrefetch: 'integer',
    consumeExpiredMessages: 'boolean',
    deliveryState: 'string'
};

/**
 * Per-ComponentType externalizable property maps. Only populated for
 * adapter types with real parameters.propdef evidence -- see module doc.
 */
const EXTERNALIZABLE_PROPERTY_TYPES: Record<string, Record<string, 'string' | 'integer' | 'boolean'>> = {
    AMQP: AMQP_PROPERTY_TYPES
};

/**
 * Default parameters.prop values for each AMQP property, used when that
 * property is placeholder-shaped (see module doc's "IMPORTANT CORRECTION").
 * Every value here is either:
 *   (a) a real, evidenced, non-tenant-specific constant -- port 443 (the
 *       universal Event Mesh AMQP1.0-over-WSS port, confirmed by
 *       amqp_reference.zip's own EMPORT=443) and path "/protocols/amqp10ws"
 *       (the fixed, protocol-defined WebSocket path, also confirmed by
 *       evidence, not a per-tenant value); or
 *   (b) an evidenced, valid "choose one" selection for a combobox-style
 *       field (authentication: "Transport_OAuth2", deliveryState:
 *       "REJECTED" -- both confirmed valid values from the reference, not
 *       tenant secrets, just a choice of mechanism/behavior); or
 *   (c) a clearly-fake, unmistakably-a-placeholder string for a genuinely
 *       tenant-specific field (host, credentialName, destinationName) --
 *       never a real company's actual infrastructure or credential, using
 *       this codebase's own existing convention for "obviously not real"
 *       values (the reserved "example.com" domain, already used throughout
 *       this compiler's own capability examples and tests); or
 *   (d) the same generic tuning-knob defaults AmqpAdapter itself already
 *       uses for the non-placeholder case (numberConcurrentProcesses=1,
 *       maxRetries=1, queuePrefetch=5, connectWithTLS=true,
 *       disableReplyTo=false, consumeExpiredMessages=false).
 */
const AMQP_PLACEHOLDER_DEFAULTS: Record<string, string> = {
    destinationName: 'REPLACE_WITH_QUEUE_NAME',
    host: 'your-event-mesh-host.example.com',
    port: '443',
    path: '/protocols/amqp10ws',
    authentication: 'Transport_OAuth2',
    credentialName: 'REPLACE_WITH_CREDENTIAL_NAME',
    connectWithTLS: 'true',
    disableReplyTo: 'false',
    NumberConcurrentProcesses: '1',
    maxRetries: '1',
    queuePrefetch: '5',
    consumeExpiredMessages: 'false',
    deliveryState: 'REJECTED'
};

/**
 * Evidence: AMQP's own param_references use the short "/attrId::x" form
 * (no "ctype::AdapterVariant/..." prefix), unlike RFC/JMS/ProcessDirect's
 * evidenced long form. Kept adapter-specific rather than a shared formula,
 * since the two forms are not interchangeable and this compiler only has
 * evidence for AMQP's shape right now.
 */
function buildAttributeId(componentType: string, propertyKey: string): string {
    if (componentType === 'AMQP') {
        return `/attrId::${propertyKey}`;
    }
    return `/attrId::${propertyKey}`;
}

/**
 * Scans one adapter's properties for "{{...}}"-shaped values and returns
 * the externalized-parameter registrations needed for each, for adapter
 * types this compiler has propdef evidence for. Returns [] for any other
 * adapter type (see module doc) or when the adapter is undefined.
 */
function collectForAdapter(adapter: { properties?: Record<string, any> } | undefined): ExternalizedParameter[] {
    if (!adapter || !adapter.properties) {
        return [];
    }
    const componentType = adapter.properties.ComponentType;
    const propertyTypes = componentType ? EXTERNALIZABLE_PROPERTY_TYPES[componentType] : undefined;
    if (!propertyTypes) {
        return [];
    }

    const category = adapter.properties.system || componentType;
    const results: ExternalizedParameter[] = [];

    for (const [propertyKey, xsdType] of Object.entries(propertyTypes)) {
        const paramKey = extractPlaceholderKey(adapter.properties[propertyKey]);
        if (paramKey) {
            results.push({
                paramKey,
                xsdType,
                attributeCategory: category,
                attributeId: buildAttributeId(componentType, propertyKey),
                defaultValue: AMQP_PLACEHOLDER_DEFAULTS[propertyKey] ?? ''
            });
        }
    }

    return results;
}

/**
 * Collects every externalized-parameter registration needed across an
 * entire IFlow's flow-level sender/receiver adapters. Mid-flow adapter
 * calls (JdbcCall/ProcessDirectCall) are not scanned -- no evidenced
 * adapter type with a mid-flow shape also has propdef-evidenced
 * externalization support yet, so there is nothing to collect there today.
 */
export function collectExternalizedParameters(flow: IFlow): ExternalizedParameter[] {
    const sender = flow.getSender();
    const receiver = flow.getReceiver();
    return [...collectForAdapter(sender), ...collectForAdapter(receiver)];
}
