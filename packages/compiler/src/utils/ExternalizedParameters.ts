import { IFlow } from '../model/IFlow';

/**
 * ExternalizedParameters - detects "{{ParamName}}" placeholder values in
 * adapter properties and produces the SAP-required parameter registration
 * data (parameters.prop entry + parameters.propdef <parameter>/<reference>
 * entries) so the placeholder actually functions as a real SAP Integration
 * Suite externalized parameter, not just literal template text sitting in
 * the .iflw with nothing backing it.
 *
 * Root cause this fixes: a "{{...}}"-shaped property value written directly
 * into a messageFlow's <ifl:property> satisfies SAP's XML schema (the
 * attribute is non-empty), but SAP Integration Suite's design-time
 * validator only SKIPS the field's own mandatory/format check when that
 * property is registered as an externalized parameter via
 * parameters.propdef's <param_references> -- otherwise it is still
 * evaluated as a literal (invalid) value. This was confirmed directly:
 * amqp_reference.zip contains "{{EMHOST}}"/"{{EMPORT}}"/"{{EMUser}}" in its
 * AMQP messageFlow AND matching <parameter>/<reference> entries in
 * parameters.propdef AND matching KEY=VALUE lines in parameters.prop --
 * all three pieces together are what make the reference flow valid on
 * import. A previous fix in this compiler only reproduced the first piece
 * (writing the placeholder text) and incorrectly assumed that alone was
 * sufficient.
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
                attributeId: buildAttributeId(componentType, propertyKey)
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
