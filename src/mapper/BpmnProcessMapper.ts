import { IFlow } from "../model/IFlow";
import { BpmnProcess } from "../ir/BpmnProcess";
import { BpmnNode } from "../ir/BpmnNode";
import { BpmnSequenceFlow } from "../ir/BpmnSequenceFlow";
import { BpmnDefinitions } from "../ir/BpmnDefinitions";
import { BpmnCollaboration } from "../ir/BpmnCollaboration";
import { BpmnParticipant } from "../ir/BpmnParticipant";
import { BpmnMessageFlow } from "../ir/BpmnMessageFlow";
import { BpmnDiagram } from "../ir/BpmnDiagram";
import { BpmnShape } from "../ir/BpmnShape";
import { BpmnEdge } from "../ir/BpmnEdge";
import { ComponentMapper } from "./ComponentMapper";

/**
 * BpmnProcessMapper - Maps entire IFlow to complete BpmnDefinitions
 *
 * This completes the FRONT-END of our compiler:
 *
 *   IFlow (Domain Model - entire flow)
 *          ↓
 *   BpmnProcessMapper ← We are here
 *          ↓
 *   ComponentMapper (for each component)
 *          ↓
 *   BpmnDefinitions (IR - complete definitions with collaboration)
 *
 * Responsibilities:
 * - Map IFlow → BpmnDefinitions (root element)
 * - Create BpmnCollaboration with participants and message flows
 * - Create BpmnProcess with nodes and sequence flows
 * - Use ComponentMapper for each component
 * - Add start/end events
 *
 * This is the orchestrator that builds the complete SAP BPMN structure.
 *
 * Example:
 *   IFlow with 3 components
 *        ↓
 *   BpmnProcessMapper
 *        ↓
 *   BpmnProcess with 3 BpmnNodes
 */
export class BpmnProcessMapper {

    private readonly componentMapper: ComponentMapper;

    constructor() {
        this.componentMapper = new ComponentMapper();
    }

    /**
     * Maps an entire IFlow to BpmnDefinitions
     *
     * This is the main entry point for the mapper layer.
     * It orchestrates the complete transformation from domain model to IR.
     *
     * Implementation for HelloWorld MVP:
     * - Creates BpmnCollaboration with HTTPS sender/receiver participants
     * - Creates BpmnProcess with start event, content modifier, end event
     * - Maps components using ComponentMapper
     * - Maps connections to sequence flows
     * - Creates message flows connecting adapters to process
     *
     * @param flow - The IFlow to map
     * @returns Complete BpmnDefinitions ready for XML serialization
     *
     * @example
     * const flow = new IFlow("HelloWorld");
     * const mapper = new BpmnProcessMapper();
     * const definitions = mapper.map(flow);
     * // → BpmnDefinitions with collaboration, participants, process
     */
    public map(flow: IFlow): BpmnDefinitions {

        const process = new BpmnProcess("Process_1", "Integration Process");
        const collaboration = new BpmnCollaboration("Collaboration_1", "Default Collaboration");

        // Add collaboration-level properties
        collaboration.addProperty("namespaceMapping", "");
        collaboration.addProperty("httpSessionHandling", "None");
        collaboration.addProperty("accessControlMaxAge", "");
        collaboration.addProperty("returnExceptionToSender", "false");
        collaboration.addProperty("log", "All events");
        collaboration.addProperty("corsEnabled", "false");
        collaboration.addProperty("exposedHeaders", "");
        collaboration.addProperty("componentVersion", "1.2");
        collaboration.addProperty("allowedHeaderList", "");
        collaboration.addProperty("ServerTrace", "false");
        collaboration.addProperty("allowedOrigins", "");
        collaboration.addProperty("accessControlAllowCredentials", "false");
        collaboration.addProperty("allowedHeaders", "*");
        collaboration.addProperty("allowedMethods", "GET");
        collaboration.addProperty("cmdVariantUri", "ctype::IFlowVariant/cname::IFlowConfiguration/version::1.2.4");

        // Add HTTPS sender adapter participant
        const senderParticipant = new BpmnParticipant(
            "Participant_1",
            "Sender",
            "EndpointSender"
        );
        senderParticipant.addProperty("enableBasicAuthentication", "false");
        senderParticipant.addProperty("ifl:type", "EndpointSender");
        collaboration.addParticipant(senderParticipant);

        // Add receiver adapter participant
        // Note: SAP uses "EndpointRecevier" (typo) - must match exactly
        const receiverParticipant = new BpmnParticipant(
            "Participant_2",
            "Receiver",
            "EndpointRecevier"
        );
        receiverParticipant.addProperty("ifl:type", "EndpointRecevier");
        collaboration.addParticipant(receiverParticipant);

        // Add process participant
        const processParticipant = new BpmnParticipant(
            "Participant_Process_1",
            "Integration Process",
            "IntegrationProcess",
            "Process_1"
        );
        collaboration.addParticipant(processParticipant);

        // Add start event
        const startEvent = new BpmnNode("StartEvent_2", "startEvent", "Start");
        process.nodes.push(startEvent);

        // Map all components to BPMN nodes
        const components = flow.getComponents();
        const nodes = this.componentMapper.mapAll(components);
        nodes.forEach(node => {
            process.nodes.push(node);
        });

        // Add end event
        const endEvent = new BpmnNode("EndEvent_2", "endEvent", "End");
        process.nodes.push(endEvent);

        // Map connections to sequence flows
        const connections = flow.getConnections();

        // Start event to first component
        if (components.length > 0) {
            const firstFlow = new BpmnSequenceFlow(
                "SequenceFlow_3",
                "StartEvent_2",
                components[0].id
            );
            process.flows.push(firstFlow);
        }

        // Component connections
        connections.forEach((connection, index) => {
            const seqFlow = new BpmnSequenceFlow(
                `SequenceFlow_${index + 4}`,
                connection.from.id,
                connection.to.id
            );
            process.flows.push(seqFlow);
        });

        // Last component to end event
        if (components.length > 0) {
            const lastComponent = components[components.length - 1];
            const lastFlow = new BpmnSequenceFlow(
                `SequenceFlow_${connections.length + 4}`,
                lastComponent.id,
                "EndEvent_2"
            );
            process.flows.push(lastFlow);
        }

        // Message flow from sender to start event with HTTPS adapter properties
        const senderMessageFlow = new BpmnMessageFlow(
            "MessageFlow_4",
            "HTTPS",
            "Participant_1",
            "StartEvent_2"
        );
        senderMessageFlow.addProperty("ComponentType", "HTTPS");
        senderMessageFlow.addProperty("Description", "");
        senderMessageFlow.addProperty("maximumBodySize", "40");
        senderMessageFlow.addProperty("ComponentNS", "sap");
        senderMessageFlow.addProperty("componentVersion", "1.5");
        senderMessageFlow.addProperty("urlPath", "/hello");
        senderMessageFlow.addProperty("Name", "HTTPS");
        senderMessageFlow.addProperty("TransportProtocolVersion", "1.5.2");
        senderMessageFlow.addProperty("ComponentSWCVName", "external");
        senderMessageFlow.addProperty("system", "Sender");
        senderMessageFlow.addProperty("xsrfProtection", "1");
        senderMessageFlow.addProperty("TransportProtocol", "HTTPS");
        senderMessageFlow.addProperty("cmdVariantUri", "ctype::AdapterVariant/cname::sap:HTTPS/tp::HTTPS/mp::None/direction::Sender/version::1.5.2");
        senderMessageFlow.addProperty("userRole", "ESBMessaging.send");
        senderMessageFlow.addProperty("senderAuthType", "RoleBased");
        senderMessageFlow.addProperty("MessageProtocol", "None");
        senderMessageFlow.addProperty("MessageProtocolVersion", "1.5.2");
        senderMessageFlow.addProperty("ComponentSWCVId", "1.5.2");
        senderMessageFlow.addProperty("direction", "Sender");
        senderMessageFlow.addProperty("clientCertificates", "");
        collaboration.addMessageFlow(senderMessageFlow);

        // Message flow from end event to receiver with HTTP adapter properties
        const receiverMessageFlow = new BpmnMessageFlow(
            "MessageFlow_5",
            "HTTP",
            "EndEvent_2",
            "Participant_2"
        );
        receiverMessageFlow.addProperty("apiName", "");
        receiverMessageFlow.addProperty("Description", "");
        receiverMessageFlow.addProperty("methodSourceExpression", "");
        receiverMessageFlow.addProperty("apiArtifactType", "");
        receiverMessageFlow.addProperty("providerAuth", "");
        receiverMessageFlow.addProperty("retryOnExceptionsTable", "");
        receiverMessageFlow.addProperty("ComponentNS", "sap");
        receiverMessageFlow.addProperty("privateKeyAlias", "");
        receiverMessageFlow.addProperty("httpMethod", "POST");
        receiverMessageFlow.addProperty("apiprovider_location_id", "");
        receiverMessageFlow.addProperty("allowedResponseHeaders", "*");
        receiverMessageFlow.addProperty("Name", "HTTP");
        receiverMessageFlow.addProperty("internetProxyType", "");
        receiverMessageFlow.addProperty("TransportProtocolVersion", "1.20.1");
        receiverMessageFlow.addProperty("retryOnException", "false");
        receiverMessageFlow.addProperty("proxyPort", "");
        receiverMessageFlow.addProperty("ComponentSWCVName", "external");
        receiverMessageFlow.addProperty("streaming", "false");
        receiverMessageFlow.addProperty("enableMPLAttachments", "true");
        receiverMessageFlow.addProperty("pooledConnectionIdleTimeout", "300000");
        receiverMessageFlow.addProperty("httpAddressQuery", "");
        receiverMessageFlow.addProperty("httpRequestTimeout", "60000");
        receiverMessageFlow.addProperty("ComponentSWCVId", "1.20.1");
        receiverMessageFlow.addProperty("providerName", "");
        receiverMessageFlow.addProperty("allowedRequestHeaders", "traceparent");
        receiverMessageFlow.addProperty("MessageProtocol", "None");
        receiverMessageFlow.addProperty("direction", "Receiver");
        receiverMessageFlow.addProperty("ComponentType", "HTTP");
        receiverMessageFlow.addProperty("httpShouldSendBody", "false");
        receiverMessageFlow.addProperty("throwExceptionOnFailure", "true");
        receiverMessageFlow.addProperty("proxyType", "default");
        receiverMessageFlow.addProperty("componentVersion", "1.20");
        receiverMessageFlow.addProperty("retryIteration", "1");
        receiverMessageFlow.addProperty("proxyHost", "");
        receiverMessageFlow.addProperty("providerUrl", "");
        receiverMessageFlow.addProperty("retryOnConnectionFailure", "false");
        receiverMessageFlow.addProperty("system", "Receiver");
        receiverMessageFlow.addProperty("authenticationMethod", "Client Certificate");
        receiverMessageFlow.addProperty("locationID", "");
        receiverMessageFlow.addProperty("retryInterval", "5");
        receiverMessageFlow.addProperty("TransportProtocol", "HTTP");
        receiverMessageFlow.addProperty("cmdVariantUri", "ctype::AdapterVariant/cname::sap:HTTP/tp::HTTP/mp::None/direction::Receiver/version::1.20.1");
        receiverMessageFlow.addProperty("httpErrorResponseCodes", "");
        receiverMessageFlow.addProperty("credentialName", "");
        receiverMessageFlow.addProperty("apiDisplayName", "");
        receiverMessageFlow.addProperty("MessageProtocolVersion", "1.20.1");
        receiverMessageFlow.addProperty("providerRelativeUrl", "");
        receiverMessageFlow.addProperty("httpAddressWithoutQuery", "");
        collaboration.addMessageFlow(receiverMessageFlow);

        // Create BPMN Diagram with visual layout
        const diagram = this.createDiagram(collaboration, process);
        const definitions = new BpmnDefinitions("Definitions_1", collaboration, process);
        definitions.setDiagram(diagram);

        return definitions;
    }

    /**
     * Creates BPMN Diagram with layout coordinates
     *
     * This generates the visual layout information required by SAP Integration Suite.
     * Layout coordinates are derived from SAP reference artifact.
     *
     * Layout:
     * - Sender participant: (40, 100), 100x140
     * - Start event: (292, 142), 32x32
     * - Call activity: (412, 132), 100x60
     * - End event: (703, 142), 32x32
     * - Receiver participant: (900, 100), 100x140
     * - Process participant: (250, 60), 540x220
     */
    private createDiagram(collaboration: BpmnCollaboration, process: BpmnProcess): BpmnDiagram {
        const diagram = new BpmnDiagram(
            "BPMNDiagram_1",
            "Default Collaboration Diagram",
            "BPMNPlane_1",
            "Collaboration_1"
        );

        // Add shapes for all participants
        collaboration.participants.forEach(participant => {
            if (participant.id === "Participant_1") {
                // Sender participant
                diagram.addShape(new BpmnShape(participant.id, participant.id, 40, 100, 100, 140));
            } else if (participant.id === "Participant_2") {
                // Receiver participant
                diagram.addShape(new BpmnShape(participant.id, participant.id, 900, 100, 100, 140));
            } else if (participant.id === "Participant_Process_1") {
                // Integration Process participant
                diagram.addShape(new BpmnShape(participant.id, participant.id, 250, 60, 540, 220));
            }
        });

        // Add shapes for process elements
        process.nodes.forEach(node => {
            if (node.type === "startEvent") {
                diagram.addShape(new BpmnShape(node.id, node.id, 292, 142, 32, 32));
            } else if (node.type === "endEvent") {
                diagram.addShape(new BpmnShape(node.id, node.id, 703, 142, 32, 32));
            } else if (node.type === "callActivity") {
                diagram.addShape(new BpmnShape(node.id, node.id, 412, 132, 100, 60));
            } else if (node.type === "exclusiveGateway") {
                // Gateway shape - diamond (40x40)
                // Evidence: SAP BPMN uses diamond shapes for gateways
                diagram.addShape(new BpmnShape(node.id, node.id, 350, 138, 40, 40));
            }
        });

        // Add edges for sequence flows
        process.flows.forEach(flow => {
            const edge = new BpmnEdge(
                flow.id,
                flow.id,
                `BPMNShape_${flow.sourceRef}`,
                `BPMNShape_${flow.targetRef}`
            );

            // Calculate waypoints based on source and target positions
            if (flow.sourceRef === "StartEvent_2" && flow.targetRef === "CallActivity_1") {
                edge.addWaypoint(308, 160);
                edge.addWaypoint(462, 160);
            } else if (flow.sourceRef === "CallActivity_1" && flow.targetRef === "EndEvent_2") {
                edge.addWaypoint(462, 160);
                edge.addWaypoint(719, 160);
            } else {
                // Generic waypoint calculation for other flows
                edge.addWaypoint(400, 160);
                edge.addWaypoint(500, 160);
            }

            diagram.addEdge(edge);
        });

        // Add edges for message flows
        collaboration.messageFlows.forEach(flow => {
            const edge = new BpmnEdge(
                flow.id,
                flow.id,
                `BPMNShape_${flow.sourceRef}`,
                `BPMNShape_${flow.targetRef}`
            );

            if (flow.id === "MessageFlow_4") {
                // Sender to StartEvent
                edge.addWaypoint(90, 170);
                edge.addWaypoint(308, 158);
            } else if (flow.id === "MessageFlow_5") {
                // EndEvent to Receiver
                edge.addWaypoint(719, 158);
                edge.addWaypoint(950, 170);
            }

            diagram.addEdge(edge);
        });

        return diagram;
    }

}
