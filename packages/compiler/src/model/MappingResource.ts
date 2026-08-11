import { Resource } from "./Resource";

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
 * Example usage:
 * ```typescript
 * // Minimal .mmap content (SAP will allow graphical editing)
 * const mapping = new MappingResource(
 *     "Order_to_Invoice.mmap",
 *     `<?xml version="1.0" encoding="UTF-8"?>
 * <mapping xmlns="http://www.sap.com/mapping" version="1.0">
 *     <source>OrderMessage</source>
 *     <target>InvoiceMessage</target>
 * </mapping>`
 * );
 *
 * // From filesystem
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

    /**
     * Creates a new Message Mapping resource
     *
     * @param name - Mapping filename (e.g., "Order_to_Invoice.mmap")
     * @param content - Optional inline mapping content (XML)
     * @param filePath - Optional filesystem path to load mapping from
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
        filePath?: string
    ) {
        if (!name.endsWith('.mmap')) {
            throw new Error(`Message mapping name must end with .mmap: ${name}`);
        }

        if (!content && !filePath) {
            throw new Error(`MappingResource must have either content or filePath: ${name}`);
        }

        this.name = name;
        this.content = content;
        this.filePath = filePath;
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
     */
    private generateProperSapFormat(): string {
        const baseName = this.getBaseName();
        const timestamp = Date.now();

        // Generate proper SAP XI Transformation format
        // This is the minimal valid format that SAP Integration Suite accepts
        return `<xiObj xmlns="urn:sap-com:xi"><idInfo xmlns="" VID="01"><vc caption="LOCAL" sp="-1" swcGuid="00000000000000000000000000000000" vcType="S"><clCxt consider="A"/></vc><key typeID="XI_TRAFO" version=""/><version>1.0</version></idInfo><documentation xmlns=""><description>Auto-generated message mapping for ${baseName}</description></documentation><generic xmlns=""><admInf><modifBy>SDK</modifBy><modifAt></modifAt><modifAtLong>${timestamp}</modifAtLong><owner/></admInf><lnks><lnkRole kpos="1" role="TARGET_IFR_MESS"><lnk rMode="R"><key typeID="xsd" version="1.1"><elem>TargetSchema.xsd</elem><elem>src/main/resources/xsd</elem><elem>Target</elem></key></lnk></lnkRole><lnkRole kpos="1" role="SOURCE_IFR_MESS"><lnk rMode="R"><key typeID="xsd" version="1.1"><elem>SourceSchema.xsd</elem><elem>src/main/resources/xsd</elem><elem>Source</elem></key></lnk></lnkRole></lnks><textInfo loadedL="EN"><textObj id="auto${timestamp}" masterL="EN" type="0"><texts lang="EN"><text label=""/></texts></textObj></textInfo></generic><AdditionalProperties xmlns=""><Property Applicable="BOTH"><PropertyName>externalNameSpace</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>choiceOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>groupsOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>topLevelChoiceOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property></AdditionalProperties><content xmlns=""><tr:XiTrafo xmlns:tr="urn:sap-com:xi:mapping:xitrafo"><tr:MetaData><mappingtool version="XI7.1"><project version="XI7.1"><libstorage><entry name="usernamespace"><functionstorage version="XI7.1"><key><key typeID=""><elem/><elem/></key></key><classname/><package/><imports/><globals><javaText/></globals><init><functionmodel><signature cacheType="0"/><name/><key/><tab/><title/><uiTitle/><implementation type="udf"><javaText/></implementation></functionmodel></init><cleanup><javaText/></cleanup><usedjars/></functionstorage></entry></libstorage><transformation><brick gid="0" path="/Target" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="/Source" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick></transformation><testData><instances/></testData><ViewState></ViewState><pcont/></project></mappingtool></tr:MetaData><tr:ByteCodeJar/><tr:SourceStructure/><tr:TargetStructure/><tr:Multiplicity>1:1</tr:Multiplicity><tr:SourceParameters><tr:Parameter><tr:Position>1</tr:Position><tr:Minoccurs>1</tr:Minoccurs><tr:Maxoccurs>1</tr:Maxoccurs></tr:Parameter></tr:SourceParameters><tr:TargetParameters><tr:Parameter><tr:Position>1</tr:Position><tr:Minoccurs>1</tr:Minoccurs><tr:Maxoccurs>1</tr:Maxoccurs></tr:Parameter></tr:TargetParameters></tr:XiTrafo></content></xiObj>`;
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
