import { Resource } from "./Resource";

/**
 * Identifies one side (source or target) of a Message Mapping's structure:
 * the packaged XSD resource it comes from, and that schema's root element
 * name. Both fields are required together -- a schema reference is
 * meaningless with only a filename or only a root element name.
 */
export interface MappingSchemaRef {
    /** Filename of an XSD resource that MUST also be packaged separately (its own `{ type: 'xsd', name: ... }` resource entry). */
    xsd: string;
    /** The root element name defined inside that XSD. */
    rootElement: string;
}

/**
 * One explicit direct field-to-field mapping, relative to the mapping's
 * source/target root elements (see `MappingSchemaRef.rootElement`) -- e.g.
 * `{ sourcePath: "Name", targetPath: "FullName" }` or, for a nested
 * structure, `{ sourcePath: "Address/City", targetPath: "Address/City" }`.
 *
 * Both paths are required together and only meaningful when the mapping
 * resource also has `sourceSchema`/`targetSchema` set (the full brick path
 * SAP needs is built as `/${rootElement}/${path}`).
 */
export interface MappingFieldRule {
    /** Source field path relative to the source root element, e.g. "Name" or "Address/City". */
    sourcePath: string;
    /** Target field path relative to the target root element, e.g. "Name" or "Address/City". */
    targetPath: string;
}

/**
 * MappingResource - Represents a Message Mapping (.mmap) artifact
 *
 * Message Mapping files define transformations between source and target message structures.
 * They are packaged in the Integration Flow bundle under the mapping/ directory.
 *
 * In SAP Integration Suite:
 * - Location: src/main/resources/mapping/{name}.mmap
 * - Referenced by: mappingpath and mappingname properties in CallActivity
 * - Execution: Runtime mapping engine with XSLT/Java transformation
 *
 * Architecture:
 * - This class implements the generic Resource interface
 * - Content can be provided inline or loaded from filesystem
 * - Packager handles ZIP bundle integration
 *
 * IMPORTANT (root cause of a reported bug -- CustomerSyncFlow.zip):
 * when the caller supplies minimal/placeholder .mmap content (see
 * `isMinimalContent()`/`generateProperSapFormat()` below), this class used
 * to auto-generate a full SAP XI Transformation structure that HARDCODED
 * "SourceSchema.xsd"/"TargetSchema.xsd" as the linked schemas and
 * "Source"/"Target" as the root element names -- regardless of what XSD
 * resources the flow actually packaged. SAP then opened the Message
 * Mapping with empty Source/Target structures and validation errors,
 * because the .mmap pointed at files that were never packaged. Fixed by
 * accepting an explicit `sourceSchema`/`targetSchema` (each an actual
 * packaged XSD filename + its real root element name) and using THOSE in
 * the generated `<lnks>` section instead of inventing names. When neither
 * is supplied, the generated mapping now omits the schema links entirely
 * (rather than inventing fake ones) -- SAP shows an unlinked mapping the
 * user configures graphically after import, which is the documented,
 * expected workflow for a template flow (see MESSAGE_MAPPING_NOTES.md),
 * not a validation error.
 *
 * IMPORTANT (root cause of a second reported bug -- CustomerSyncFlow with
 * red/unmapped target fields): linking the schemas above only tells SAP
 * what the source/target STRUCTURES are -- it does not map any fields.
 * Without at least one `<brick>` per field inside `<transformation>`, SAP
 * shows every target field as unmapped (red) even though the structures
 * open correctly. `fieldMappings` (an explicit, caller-supplied list of
 * `{ sourcePath, targetPath }` pairs -- see `MappingFieldRule`) is used to
 * emit one real direct-mapping `<brick>` per pair, in addition to the
 * existing root-level structural brick. Field names are never inferred or
 * guessed by matching source/target structures against each other -- a
 * wrong auto-match would be a fake mapping that merely looks valid, which
 * is exactly what this class must not produce.
 *

 * Example usage:
 * ```typescript
 * // Minimal content + real schema references -- the compiler generates a
 * // full SAP XI Transformation that links the ACTUAL packaged XSDs.
 * const mapping = new MappingResource(
 *     "Customer_to_Target.mmap",
 *     '<?xml version="1.0"?><mapping></mapping>',
 *     undefined,
 *     { xsd: "Customer.xsd", rootElement: "Customer" },
 *     { xsd: "Target.xsd", rootElement: "Target" }
 * );
 *
 * // From filesystem (a real .mmap exported from SAP's graphical editor --
 * // passes through unchanged, schema refs not needed)
 * const mapping = new MappingResource(
 *     "Complex_Transform.mmap",
 *     undefined,
 *     "./mappings/Complex_Transform.mmap"
 * );
 * ```
 *
 * Package structure:
 * ```
 * IntegrationFlow.zip
 * └── src/main/resources/
 *     └── mapping/
 *         └── Order_to_Invoice.mmap
 * ```
 */
export class MappingResource implements Resource {

    public readonly type: string = "mapping";
    public readonly name: string;
    public readonly content?: string;
    public readonly filePath?: string;
    public readonly sourceSchema?: MappingSchemaRef;
    public readonly targetSchema?: MappingSchemaRef;
    public readonly fieldMappings?: MappingFieldRule[];

    /**
     * Creates a new Message Mapping resource
     *
     * @param name - Mapping filename (e.g., "Order_to_Invoice.mmap")
     * @param content - Optional inline mapping content (XML)
     * @param filePath - Optional filesystem path to load mapping from
     * @param sourceSchema - Optional real source XSD + root element, used
     *        only when `content` is minimal/placeholder (see
     *        `isMinimalContent()`) -- the compiler generates a proper SAP
     *        XI Transformation linking this ACTUAL packaged schema instead
     *        of inventing a name. That XSD must also be added to the flow
     *        as its own `XsdResource` -- this is validated by
     *        `ComponentFactory.fromJson()`.
     * @param targetSchema - Same as sourceSchema, for the target structure.
     * @param fieldMappings - Optional explicit list of direct source-field ->
     *        target-field mappings (see `MappingFieldRule`), used only when
     *        `content` is minimal/placeholder. Requires both `sourceSchema`
     *        and `targetSchema` to be set (their root element names anchor
     *        the full field paths SAP needs). Without this, an
     *        auto-generated mapping links the source/target STRUCTURES but
     *        maps no individual fields, so SAP shows every target field as
     *        unmapped (red).
     *
     * Note: Provide either content OR filePath, not both.
     * If both are provided, content takes precedence.
     *
     * @example
     * ```typescript
     * // Inline minimal mapping
     * const mapping = new MappingResource(
     *     "simple.mmap",
     *     `<?xml version="1.0" encoding="UTF-8"?>
     * <mapping xmlns="http://www.sap.com/mapping" version="1.0">
     *     <source>Source</source>
     *     <target>Target</target>
     * </mapping>`
     * );
     *
     * // From file
     * const mapping = new MappingResource(
     *     "complex.mmap",
     *     undefined,
     *     "./mappings/complex.mmap"
     * );
     * ```
     */
    constructor(
        name: string,
        content?: string,
        filePath?: string,
        sourceSchema?: MappingSchemaRef,
        targetSchema?: MappingSchemaRef,
        fieldMappings?: MappingFieldRule[]
    ) {
        if (!name.endsWith('.mmap')) {
            throw new Error(`Message mapping name must end with .mmap: ${name}`);
        }

        if (!content && !filePath) {
            throw new Error(`MappingResource must have either content or filePath: ${name}`);
        }

        if (fieldMappings && fieldMappings.length > 0 && (!sourceSchema || !targetSchema)) {
            throw new Error(
                `Mapping resource "${name}": fieldMappings requires both sourceSchema and targetSchema to be set ` +
                `(field paths are anchored at "/<rootElement>", which is only known once the real schema is linked).`
            );
        }

        this.name = name;
        this.content = content;
        this.filePath = filePath;
        this.sourceSchema = sourceSchema;
        this.targetSchema = targetSchema;
        this.fieldMappings = fieldMappings && fieldMappings.length > 0 ? fieldMappings : undefined;
    }

    /**
     * Gets the mapping content
     *
     * Returns inline content if available, otherwise reads from filePath.
     * If content is minimal/placeholder, auto-generates proper SAP XI Transformation format.
     *
     * @returns Mapping content as string (XML)
     * @throws Error if filePath doesn't exist
     */
    public getContent(): string {
        let rawContent: string;

        if (this.content) {
            rawContent = this.content;
        } else if (this.filePath) {
            const fs = require('fs');
            if (!fs.existsSync(this.filePath)) {
                throw new Error(`Message mapping file not found: ${this.filePath}`);
            }
            rawContent = fs.readFileSync(this.filePath, 'utf-8');
        } else {
            throw new Error(`MappingResource has no content or filePath: ${this.name}`);
        }

        // Auto-enhance minimal/placeholder content to proper SAP format
        if (this.isMinimalContent(rawContent)) {
            return this.generateProperSapFormat();
        }

        return rawContent;
    }

    /**
     * Checks if content is minimal/placeholder format that needs enhancement
     */
    private isMinimalContent(content: string): boolean {
        // Detect common placeholder patterns that won't work in SAP
        const minimalPatterns = [
            /<mapping[^>]*>\s*<\/mapping>/i,  // Empty mapping tag
            /<mapping[^>]*>[^<]*<\/mapping>/i,  // Mapping with only text content
            content.length < 500,  // Too short to be real SAP format
            !content.includes('xiObj'),  // Missing SAP XI root element
            !content.includes('lnks'),  // Missing links section
            !content.includes('transformation')  // Missing transformation section
        ];

        return minimalPatterns.some(pattern =>
            typeof pattern === 'boolean' ? pattern : pattern.test(content)
        );
    }

    /**
     * Generates proper SAP XI Transformation format
     * This creates a valid .mmap that SAP can open and edit graphically
     *
     * If sourceSchema/targetSchema were supplied, the <lnks> section links
     * the ACTUAL packaged XSD resources (and the transformation's root
     * bricks use their real root element names) -- never an invented
     * filename. If neither was supplied, the <lnks> section is left empty
     * (no schema linked) rather than pointing at a schema that doesn't
     * exist in the package -- SAP shows an unlinked mapping the user
     * configures graphically after import (the documented workflow for a
     * template flow), instead of a validation error for a missing file.
     *
     * If `fieldMappings` were supplied, one additional direct-mapping
     * `<brick>` is emitted per pair -- evidence format: `reference/sap-exports`
     * real mapping `MM_Mat_3PL_to_S4HANA.mmap`, e.g.
     * `<brick path=".../ENTRY_QNT" type="Dst"><arg><brick path=".../Sales_QTY" type="Src"/></arg><group/></brick>`
     * -- so SAP recognizes those target fields as actually mapped instead of
     * showing them unmapped (red).
     */
    private generateProperSapFormat(): string {
        const baseName = this.getBaseName();
        const timestamp = Date.now();

        const lnks = (this.sourceSchema && this.targetSchema)
            ? `<lnkRole kpos="1" role="TARGET_IFR_MESS"><lnk rMode="R"><key typeID="xsd" version="1.1"><elem>${this.escapeXml(this.targetSchema.xsd)}</elem><elem>src/main/resources/xsd</elem><elem>${this.escapeXml(this.targetSchema.rootElement)}</elem></key></lnk></lnkRole><lnkRole kpos="1" role="SOURCE_IFR_MESS"><lnk rMode="R"><key typeID="xsd" version="1.1"><elem>${this.escapeXml(this.sourceSchema.xsd)}</elem><elem>src/main/resources/xsd</elem><elem>${this.escapeXml(this.sourceSchema.rootElement)}</elem></key></lnk></lnkRole>`
            : '';

        const sourcePath = this.sourceSchema ? `/${this.sourceSchema.rootElement}` : '/Source';
        const targetPath = this.targetSchema ? `/${this.targetSchema.rootElement}` : '/Target';

        const fieldBricks = (this.fieldMappings || []).map(rule => {
            const srcFieldPath = `${sourcePath}/${rule.sourcePath}`.replace(/\/+/g, '/');
            const tgtFieldPath = `${targetPath}/${rule.targetPath}`.replace(/\/+/g, '/');
            return `<brick gid="0" path="${this.escapeXml(tgtFieldPath)}" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="${this.escapeXml(srcFieldPath)}" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick>`;
        }).join('');

        // Generate proper SAP XI Transformation format
        // This is the minimal valid format that SAP Integration Suite accepts
        return `<xiObj xmlns="urn:sap-com:xi"><idInfo xmlns="" VID="01"><vc caption="LOCAL" sp="-1" swcGuid="00000000000000000000000000000000" vcType="S"><clCxt consider="A"/></vc><key typeID="XI_TRAFO" version=""/><version>1.0</version></idInfo><documentation xmlns=""><description>Auto-generated message mapping for ${baseName}</description></documentation><generic xmlns=""><admInf><modifBy>SDK</modifBy><modifAt></modifAt><modifAtLong>${timestamp}</modifAtLong><owner/></admInf><lnks>${lnks}</lnks><textInfo loadedL="EN"><textObj id="auto${timestamp}" masterL="EN" type="0"><texts lang="EN"><text label=""/></texts></textObj></textInfo></generic><AdditionalProperties xmlns=""><Property Applicable="BOTH"><PropertyName>externalNameSpace</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>choiceOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>groupsOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>topLevelChoiceOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property></AdditionalProperties><content xmlns=""><tr:XiTrafo xmlns:tr="urn:sap-com:xi:mapping:xitrafo"><tr:MetaData><mappingtool version="XI7.1"><project version="XI7.1"><libstorage><entry name="usernamespace"><functionstorage version="XI7.1"><key><key typeID=""><elem/><elem/></key></key><classname/><package/><imports/><globals><javaText/></globals><init><functionmodel><signature cacheType="0"/><name/><key/><tab/><title/><uiTitle/><implementation type="udf"><javaText/></implementation></functionmodel></init><cleanup><javaText/></cleanup><usedjars/></functionstorage></entry></libstorage><transformation><brick gid="0" path="${targetPath}" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="${sourcePath}" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick>${fieldBricks}</transformation><testData><instances/></testData><ViewState></ViewState><pcont/></project></mappingtool></tr:MetaData><tr:ByteCodeJar/><tr:SourceStructure/><tr:TargetStructure/><tr:Multiplicity>1:1</tr:Multiplicity><tr:SourceParameters><tr:Parameter><tr:Position>1</tr:Position><tr:Minoccurs>1</tr:Minoccurs><tr:Maxoccurs>1</tr:Maxoccurs></tr:Parameter></tr:SourceParameters><tr:TargetParameters><tr:Parameter><tr:Position>1</tr:Position><tr:Minoccurs>1</tr:Minoccurs><tr:Maxoccurs>1</tr:Maxoccurs></tr:Parameter></tr:TargetParameters></tr:XiTrafo></content></xiObj>`;
    }

    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Gets the package path for this resource
     *
     * Returns the path where this resource should be placed in the ZIP bundle.
     *
     * @returns Package path (e.g., "src/main/resources/mapping/Order_to_Invoice.mmap")
     */
    public getPackagePath(): string {
        return `src/main/resources/mapping/${this.name}`;
    }

    /**
     * Gets the BPMN reference path
     *
     * Returns the path used to reference this resource from BPMN XML.
     *
     * @returns BPMN reference path (e.g., "mapping/Order_to_Invoice.mmap")
     */
    public getBpmnReference(): string {
        return `mapping/${this.name}`;
    }

    /**
     * Gets the mapping URI
     *
     * Returns the SAP-specific URI format for mappinguri property.
     *
     * @returns Mapping URI (e.g., "dir://mmap/src/main/resources/mapping/Order_to_Invoice.mmap")
     */
    public getMappingUri(): string {
        return `dir://mmap/${this.getPackagePath()}`;
    }

    /**
     * Gets the base mapping name (without .mmap extension)
     *
     * @returns Base name (e.g., "Order_to_Invoice")
     */
    public getBaseName(): string {
        return this.name.replace('.mmap', '');
    }
}
