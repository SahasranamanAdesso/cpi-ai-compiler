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
import { Router } from "../model/Router";
import { Multicast } from "../model/Multicast";
import { JdbcCall } from "../model/JdbcCall";
import { ProcessDirectCall } from "../model/ProcessDirectCall";
import { IdGenerator } from "../utils/IdGenerator";
import { ensureUniqueTechnicalName } from "../utils/XmlName";

/**
 * Structural shape shared by every mid-flow adapter-call component
 * (JdbcCall, ProcessDirectCall, and any future one following the same
 * pattern): a Component whose `.adapter` carries the messageFlow
 * properties + cmdVariantUri for the companion participant/messageFlow
 * BpmnProcessMapper generates alongside the serviceTask itself.
 */
interface MidFlowAdapterCall {
    readonly id: string;
    readonly name: string;
    readonly adapter: {
        readonly properties: Record<string, any>;
        getCmdVariantUri(): string;
    };
}

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

        // Channel (messageFlow "name" attribute) uniqueness across the WHOLE
        // iFlow -- sender, receiver, and every mid-flow adapter call (JDBC,
        // etc.) share this one set. Each adapter class already sanitizes its
        // own channel name into a valid NCName (HttpAdapter, JdbcAdapter),
        // but sanitization alone can't prevent two different adapters from
        // producing the identical name (e.g. two JdbcCall instances both
        // defaulting to the literal "JDBC" channel name). Collisions are
        // resolved deterministically with a numeric suffix.
        const usedChannelNames = new Set<string>();

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
        // Track route index per gateway for proper metadata assignment
        const gatewayRouteIndex = new Map<string, number>();

        connections.forEach((connection, index) => {
            const flowId = `SequenceFlow_${index + 4}`;

            // Check if source is a Router (exclusive gateway) or Multicast (parallel gateway)
            const isFromRouter = connection.from instanceof Router;
            const isFromMulticast = connection.from instanceof Multicast;

            if (isFromRouter) {
                // This is a Router route (exclusive gateway) - add conditional SAP metadata
                const router = connection.from as Router;
                const routes = router.getAllRoutes();

                // Get current route index for this gateway
                const currentIndex = gatewayRouteIndex.get(router.id) || 0;
                gatewayRouteIndex.set(router.id, currentIndex + 1);

                // Get the corresponding route (if defined)
                const route = routes[currentIndex];

                // Determine if this is the default route
                const isDefaultRoute = route && (!route.condition || route.condition === "");

                // Create route name from condition or use "Default"
                const routeName = route?.name || (isDefaultRoute ? "Default" : `Route ${currentIndex + 1}`);

                // Create sequence flow with SAP gateway route metadata
                // Evidence: IPRO_PRODUCT_HTTP.iflw lines 964-1013
                const routeProperties: Record<string, string> = {
                    expressionType: isDefaultRoute ? "XML" : "NonXML",  // Evidence: SAP line 968, 985
                    componentVersion: "1.0",                              // Evidence: SAP line 972, 989
                    cmdVariantUri: "ctype::FlowstepVariant/cname::GatewayRoute/version::1.0.0"  // Evidence: SAP line 976, 993
                };

                const seqFlow = new BpmnSequenceFlow(
                    flowId,
                    connection.from.id,
                    connection.to.id,
                    routeName,                                  // Route name attribute
                    isDefaultRoute ? undefined : route?.condition,  // Condition (only for non-default routes)
                    routeProperties                            // SAP metadata
                );

                process.flows.push(seqFlow);
            } else if (isFromMulticast) {
                // This is a Multicast branch (parallel gateway) - simple flow, no conditions
                // Evidence: IPRO_SRM_MM_MAIN.iflw lines 1416-1420 (outgoing flows have no conditions)
                const multicast = connection.from as Multicast;

                // Get current branch index for this multicast
                const currentIndex = gatewayRouteIndex.get(multicast.id) || 0;
                gatewayRouteIndex.set(multicast.id, currentIndex + 1);

                // Simple sequence flow - all branches execute, no conditions
                const seqFlow = new BpmnSequenceFlow(
                    flowId,
                    connection.from.id,
                    connection.to.id,
                    "",       // No name needed
                    undefined, // No condition (all branches execute)
                    {}        // No special properties for parallel branches
                );

                process.flows.push(seqFlow);
            } else {
                // Regular connection (not from gateway) - no special metadata
                const seqFlow = new BpmnSequenceFlow(
                    flowId,
                    connection.from.id,
                    connection.to.id
                );
                process.flows.push(seqFlow);
            }
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

        // Message flow from sender to start event
        // Use custom sender adapter if provided, otherwise default HTTPS
        const sender = flow.getSender();
        const senderChannelName = ensureUniqueTechnicalName(sender ? sender.name : "HTTPS", usedChannelNames);
        const senderMessageFlow = new BpmnMessageFlow(
            "MessageFlow_4",
            senderChannelName,
            "Participant_1",
            "StartEvent_2"
        );

        if (sender) {
            // Use custom sender configuration
            const senderProps = sender.properties;
            Object.keys(senderProps).forEach(key => {
                senderMessageFlow.addProperty(key, senderProps[key]);
            });
            // Add cmdVariantUri if adapter has the method
            if ('getCmdVariantUri' in sender && typeof sender.getCmdVariantUri === 'function') {
                senderMessageFlow.addProperty("cmdVariantUri", sender.getCmdVariantUri());
            }
            senderMessageFlow.addProperty("direction", "Sender");
        } else {
            // Default HTTPS sender configuration
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
        }
        collaboration.addMessageFlow(senderMessageFlow);

        // Message flow from end event to receiver
        // Use custom receiver adapter if provided, otherwise default HTTP
        const receiver = flow.getReceiver();
        const receiverChannelName = ensureUniqueTechnicalName(receiver ? receiver.name : "HTTP", usedChannelNames);
        const receiverMessageFlow = new BpmnMessageFlow(
            "MessageFlow_5",
            receiverChannelName,
            "EndEvent_2",
            "Participant_2"
        );

        if (receiver) {
            // Use custom receiver configuration
            const receiverProps = receiver.properties;
            Object.keys(receiverProps).forEach(key => {
                receiverMessageFlow.addProperty(key, receiverProps[key]);
            });
            // Add cmdVariantUri if adapter has the method
            if ('getCmdVariantUri' in receiver && typeof receiver.getCmdVariantUri === 'function') {
                receiverMessageFlow.addProperty("cmdVariantUri", receiver.getCmdVariantUri());
            }
            receiverMessageFlow.addProperty("direction", "Receiver");
        } else {
            // Default HTTP receiver configuration
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
        }
        collaboration.addMessageFlow(receiverMessageFlow);

        // Mid-flow adapter calls (JDBC, Process Direct) each need their own
        // receiver participant + messageFlow, in addition to whatever the
        // flow's single sender/receiver adapters already added above.
        // Unlike Router/Multicast (which only affect sequence flow metadata),
        // these components change the collaboration itself, so they're
        // handled here rather than in ComponentMapper. Shared across every
        // mid-flow adapter-call type via mapMidFlowAdapterCall() so adding
        // a new one (following this same JdbcCall/ProcessDirectCall pattern)
        // never means copy-pasting this block again.
        components.forEach(component => {
            if (component instanceof JdbcCall) {
                this.mapMidFlowAdapterCall(component, "JDBC", "Jdbc", collaboration, usedChannelNames);
            } else if (component instanceof ProcessDirectCall) {
                this.mapMidFlowAdapterCall(component, "ProcessDirect", "ProcessDirect", collaboration, usedChannelNames);
            }
        });

        // Create BPMN Diagram with visual layout
        const diagram = this.createDiagram(collaboration, process);
        const definitions = new BpmnDefinitions("Definitions_1", collaboration, process);
        definitions.setDiagram(diagram);

        return definitions;
    }

    /**
     * Generates the companion receiver participant + messageFlow for a
     * mid-flow adapter-call component (JdbcCall, ProcessDirectCall, ...).
     *
     * Distinct ID prefixes per adapter type (e.g. "Participant_Jdbc" /
     * "Participant_ProcessDirect") avoid colliding with the fixed
     * "Participant_1"/"Participant_2"/"MessageFlow_4"/"MessageFlow_5"
     * literals used for the flow's own sender/receiver, with each other
     * across adapter types, and with ProcessCall/other component IDs --
     * the same class of duplicate-ID bug fixed for ProcessCall (CP-001).
     * `IdGenerator` guarantees no two calls (of the same or different type)
     * ever produce the same participant/messageFlow id, and
     * `ensureUniqueTechnicalName` guarantees no two channels share a name
     * even when every instance defaults to the same literal channel name
     * (e.g. two ProcessDirectCall steps both defaulting to "ProcessDirect").
     *
     * @param component - the mid-flow call component (JdbcCall, ProcessDirectCall)
     * @param defaultChannelName - literal channel name evidence shows this
     *        adapter type always uses (e.g. "JDBC", "ProcessDirect") when
     *        not customized
     * @param idPrefix - suffix for the "Participant_"/"MessageFlow_" id prefixes
     */
    private mapMidFlowAdapterCall(
        component: MidFlowAdapterCall,
        defaultChannelName: string,
        idPrefix: string,
        collaboration: BpmnCollaboration,
        usedChannelNames: Set<string>
    ): void {
        const participantId = IdGenerator.next(`Participant_${idPrefix}`);
        const messageFlowId = IdGenerator.next(`MessageFlow_${idPrefix}`);
        const adapter = component.adapter;

        const participant = new BpmnParticipant(
            participantId,
            adapter.properties.system || component.name,
            "EndpointRecevier"
        );
        participant.addProperty("ifl:type", "EndpointRecevier");
        collaboration.addParticipant(participant);

        const channelName = ensureUniqueTechnicalName(defaultChannelName, usedChannelNames);
        const messageFlow = new BpmnMessageFlow(
            messageFlowId,
            channelName,
            component.id,
            participantId,
            "Receiver",
            defaultChannelName,
            { ...adapter.properties }
        );
        messageFlow.addProperty("cmdVariantUri", adapter.getCmdVariantUri());
        collaboration.addMessageFlow(messageFlow);
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
        // Mid-flow adapter participants (e.g. JDBC) use distinct ID prefixes
        // ("Participant_Jdbc_N") and are stacked above the process lane,
        // spaced out horizontally so multiple instances don't overlap.
        let extraParticipantIndex = 0;
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
            } else {
                // Mid-flow adapter participant (JDBC, etc.)
                const x = 250 + (extraParticipantIndex * 180);
                diagram.addShape(new BpmnShape(participant.id, participant.id, x, -250, 100, 140));
                extraParticipantIndex++;
            }
        });

        // Add shapes for process elements
        // For Router flows, position CallActivities/ServiceTasks vertically to avoid overlap
        let callActivityIndex = 0;
        const callActivityCount = process.nodes.filter(n => n.type === "callActivity" || n.type === "serviceTask").length;

        process.nodes.forEach(node => {
            if (node.type === "startEvent") {
                diagram.addShape(new BpmnShape(node.id, node.id, 292, 142, 32, 32));
            } else if (node.type === "endEvent") {
                diagram.addShape(new BpmnShape(node.id, node.id, 703, 142, 32, 32));
            } else if (node.type === "callActivity" || node.type === "serviceTask") {
                // Position CallActivities/ServiceTasks vertically for Router flows
                // Base position: (412, 132)
                // Vertical spacing: 80 pixels between components
                const baseY = 100;
                const spacing = 80;
                const y = baseY + (callActivityIndex * spacing);

                diagram.addShape(new BpmnShape(node.id, node.id, 412, y, 100, 60));
                callActivityIndex++;
            } else if (node.type === "exclusiveGateway") {
                // Gateway shape - diamond (40x40)
                // Position gateway vertically centered relative to its routes
                const centerY = 100 + ((callActivityCount - 1) * 80 / 2) + 30;
                diagram.addShape(new BpmnShape(node.id, node.id, 350, centerY, 40, 40));
            } else if (node.type === "parallelGateway") {
                // Parallel Gateway shape - diamond (40x40)
                // Position similar to exclusive gateway
                const centerY = 100 + ((callActivityCount - 1) * 80 / 2) + 30;
                diagram.addShape(new BpmnShape(node.id, node.id, 350, centerY, 40, 40));
            }
        });

        // Add edges for sequence flows
        // Build a map of node positions for waypoint calculation
        const nodePositions = new Map<string, {x: number, y: number}>();
        process.nodes.forEach(node => {
            const shape = diagram.shapes.find(s => s.bpmnElement === node.id);
            if (shape) {
                // Calculate center point of the shape
                const centerX = shape.x + (shape.width / 2);
                const centerY = shape.y + (shape.height / 2);
                nodePositions.set(node.id, {x: centerX, y: centerY});
            }
        });

        process.flows.forEach(flow => {
            const edge = new BpmnEdge(
                flow.id,
                flow.id,
                `BPMNShape_${flow.sourceRef}`,
                `BPMNShape_${flow.targetRef}`
            );

            // Get source and target positions
            const sourcePos = nodePositions.get(flow.sourceRef);
            const targetPos = nodePositions.get(flow.targetRef);

            if (sourcePos && targetPos) {
                // Add waypoints from source center to target center
                edge.addWaypoint(sourcePos.x, sourcePos.y);
                edge.addWaypoint(targetPos.x, targetPos.y);
            } else {
                // Fallback to generic waypoints
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
            } else {
                // Mid-flow adapter messageFlow (e.g. JDBC): derive waypoints
                // from the already-placed shapes for its source/target.
                const sourceShape = diagram.shapes.find(s => s.bpmnElement === flow.sourceRef);
                const targetShape = diagram.shapes.find(s => s.bpmnElement === flow.targetRef);
                if (sourceShape && targetShape) {
                    edge.addWaypoint(sourceShape.x + sourceShape.width / 2, sourceShape.y + sourceShape.height / 2);
                    edge.addWaypoint(targetShape.x + targetShape.width / 2, targetShape.y + targetShape.height / 2);
                }
            }

            diagram.addEdge(edge);
        });

        return diagram;
    }

}
