/**
 * BpmnSequenceFlow - Intermediate Representation of a BPMN sequence flow
 *
 * Represents a connection between two BPMN nodes.
 *
 * For simple flows:
 * ```xml
 * <sequenceFlow id="..." sourceRef="StartEvent_1" targetRef="CallActivity_1"/>
 * ```
 *
 * For Router (Gateway) conditional routes (SAP-compatible):
 * ```xml
 * <sequenceFlow id="..." name="POST" sourceRef="Gateway_1" targetRef="CallActivity_1">
 *   <extensionElements>
 *     <ifl:property><key>expressionType</key><value>NonXML</value></ifl:property>
 *     <ifl:property><key>componentVersion</key><value>1.0</value></ifl:property>
 *     <ifl:property><key>cmdVariantUri</key><value>ctype::FlowstepVariant/cname::GatewayRoute/version::1.0.0</value></ifl:property>
 *   </extensionElements>
 *   <conditionExpression xsi:type="bpmn2:tFormalExpression">${header.method} = 'POST'</conditionExpression>
 * </sequenceFlow>
 * ```
 *
 * Evidence: IPRO_PRODUCT_HTTP.iflw lines 964-1013
 */
export class BpmnSequenceFlow {
    /**
     * SAP properties for gateway routes
     * Required for conditional routes from exclusiveGateway
     * Evidence: SAP lines 965-978
     */
    public properties: Record<string, string> = {};

    /**
     * Route name (displayed in SAP editor)
     * Evidence: SAP line 964 - name="POST"
     */
    public name?: string;

    /**
     * Condition expression for gateway routes
     * Evidence: SAP line 979
     * Format: ${expression}
     * Only present for conditional routes, absent for default route
     */
    public condition?: string;

    constructor(
        public readonly id: string,
        public readonly sourceRef: string,
        public readonly targetRef: string,
        name?: string,
        condition?: string,
        properties?: Record<string, string>
    ) {
        this.name = name;
        this.condition = condition;
        if (properties) {
            this.properties = properties;
        }
    }

    /**
     * Adds a SAP property for this route
     */
    public addProperty(key: string, value: string): void {
        this.properties[key] = value;
    }
}
