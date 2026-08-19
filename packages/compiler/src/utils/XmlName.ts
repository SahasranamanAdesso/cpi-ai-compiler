/**
 * XmlName - Shared naming layer for SAP Cloud Integration technical
 * identifiers: the BPMN <messageFlow name="..."> "Channel Name" attribute,
 * and (via ComponentFactory) BPMN element `id` attributes derived from
 * AI-supplied component ids.
 *
 * SAP Cloud Integration validates these as XML NCNames: must start with a
 * letter or underscore and contain only letters, digits, '.', '-', or '_'
 * afterwards -- no whitespace, punctuation, URLs, or quotes. Violating this
 * produces SAP's:
 *   "Channel Name should be valid XML NCName"
 *   "Whitespace not allowed in <Sender|Receiver> name"
 *
 * This is DISTINCT from the human-readable SAP "Name"/"Description"
 * ifl:property values (shown in the properties panel) and from component
 * display names -- those remain free text and are never touched by this
 * function. Callers keep the original display name in a "Name" property
 * alongside the sanitized technical identifier produced here.
 *
 * Normalization preserves word boundaries as underscores rather than
 * concatenating words together, so the technical name stays legible when
 * read directly in the generated XML or in error messages:
 *   "Domestic Processing Service"      -> "Domestic_Processing_Service"
 *   "International Processing Service" -> "International_Processing_Service"
 *   "Query Customer DB"                -> "Query_Customer_DB"
 *   "Customer Order Flow"              -> "Customer_Order_Flow"
 *   "HTTPS Receiver"                   -> "HTTPS_Receiver"
 *   "123 Customer"                     -> "_123_Customer"
 *   "Customer/Order Channel"           -> "Customer_Order_Channel"
 */

const NCNAME_INVALID_RUN = /[^A-Za-z0-9_.-]+/g;
const NCNAME_VALID_START = /^[A-Za-z_]/;
const NCNAME_FULL = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

/**
 * Normalizes a display name into a valid, deterministic XML NCName.
 *
 * @param value - The human-readable name to normalize (e.g. AI JSON `name`
 *                or `id`). Not required to be defined -- falsy input falls
 *                straight through to `fallback`.
 * @param fallback - Value returned when `value` is empty or sanitizes to
 *                    nothing (e.g. a string made entirely of punctuation).
 *                    Callers should pass an already-valid technical name
 *                    here (a literal, or an IdGenerator-produced id).
 */
export function toXmlTechnicalName(value: string | undefined, fallback: string): string {
    const trimmed = (value || '').trim();
    if (trimmed.length === 0) {
        return fallback;
    }

    // Collapse every run of whitespace or NCName-invalid characters into a
    // single underscore, then trim/collapse any underscores that produces
    // at the edges or back-to-back (e.g. two adjacent separators).
    let name = trimmed.replace(NCNAME_INVALID_RUN, '_');
    name = name.replace(/_+/g, '_');
    name = name.replace(/^_+|_+$/g, '');

    if (name.length === 0) {
        return fallback;
    }

    // NCName must not start with a digit, '.', or '-'.
    if (!NCNAME_VALID_START.test(name)) {
        name = `_${name}`;
    }

    return name;
}

/**
 * Returns `candidate` if not already present in `used`, otherwise appends a
 * deterministic numeric suffix ("_2", "_3", ...) until a free name is found.
 * Registers whichever name is returned into `used` before returning it, so
 * repeated calls against the same set never hand out the same name twice.
 *
 * This is how uniqueness is enforced across an entire generated iFlow:
 * normalization alone can still collide (two different display names can
 * sanitize to the same technical name, or two components can share a
 * display name outright) -- callers must run every technical name for a
 * single iFlow through the same `used` set.
 */
export function ensureUniqueTechnicalName(candidate: string, used: Set<string>): string {
    if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
    }

    let suffix = 2;
    while (used.has(`${candidate}_${suffix}`)) {
        suffix++;
    }

    const unique = `${candidate}_${suffix}`;
    used.add(unique);
    return unique;
}

/**
 * Checks whether a string is already a valid XML NCName, with no
 * normalization applied. Used by validate() to catch anything that reaches
 * the IFlow model without having gone through toXmlTechnicalName().
 */
export function isValidXmlNCName(value: string): boolean {
    return NCNAME_FULL.test(value);
}
