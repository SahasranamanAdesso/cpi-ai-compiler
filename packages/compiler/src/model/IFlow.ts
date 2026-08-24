import { Component } from "./Component";
import { Connection } from "./Connection";
import { Resource } from "./Resource";
import { LocalIntegrationProcess } from "./LocalIntegrationProcess";
import { ExceptionSubprocess } from "./ExceptionSubprocess";
import { HttpAdapter } from "./HttpAdapter";
import { ODataAdapter } from "./ODataAdapter";
import { SftpAdapter } from "./SftpAdapter";
import { SoapAdapter } from "./SoapAdapter";
import { IdocAdapter } from "./IdocAdapter";
import { JdbcAdapter } from "./JdbcAdapter";
import { ProcessDirectAdapter } from "./ProcessDirectAdapter";
import { RfcAdapter } from "./RfcAdapter";
import { JmsAdapter } from "./JmsAdapter";

/**
 * IFlow - Internal Representation (IR) of a CPI Integration Flow
 *
 * This is the compiler's internal model. It's built from the high-level
 * domain API (IFlowDefinition) and transformed into BPMN XML.
 *
 * An IFlow is a graph structure containing:
 * - Components (metadata-driven representations of CPI elements)
 * - Connections (sequence flows between components)
 * - Resources (external artifacts like Groovy scripts, mappings, schemas)
 *
 * Architecture:
 *   IFlowDefinition (domain) → IFlow (IR) → BPMN XML (output)
 */
export class IFlow {
    /**
     * The name of the integration flow
     */
    public readonly name: string;

    /**
     * Internal collection of components in this flow
     */
    private readonly components: Component[] = [];

    /**
     * Internal collection of connections (sequence flows) between components
     */
    private readonly connections: Connection[] = [];

    /**
     * Internal collection of resources (Groovy scripts, mappings, schemas, etc.)
     */
    private readonly resources: Resource[] = [];

    /**
     * Internal collection of Local Integration Processes (subprocesses)
     */
    private readonly subProcesses: LocalIntegrationProcess[] = [];

    /**
     * Internal collection of Exception Subprocesses (error handlers)
     */
    private readonly exceptionSubprocesses: ExceptionSubprocess[] = [];

    /**
     * Sender adapter (HTTP, OData, SFTP, SOAP, IDoc, Process Direct, JMS, etc.)
     * Note: JdbcAdapter/RfcAdapter are receiver-only (no JDBC/RFC Sender
     * exists in SAP CPI) and are intentionally excluded from this union.
     */
    private sender?: HttpAdapter | ODataAdapter | SftpAdapter | SoapAdapter | IdocAdapter | ProcessDirectAdapter | JmsAdapter;

    /**
     * Receiver adapter (HTTP, OData, SFTP, SOAP, IDoc, JDBC, Process Direct, RFC, JMS, etc.)
     * Note: RfcAdapter is receiver-only (no RFC Sender exists in SAP CPI --
     * RFC is always an outbound call from CPI into an SAP system) and is
     * intentionally excluded from the `sender` union above. JmsAdapter,
     * unlike Rfc/Jdbc, genuinely supports both directions (evidence:
     * jms_reference.zip shows both a Sender and a Receiver JMS messageFlow).
     */
    private receiver?: HttpAdapter | ODataAdapter | SftpAdapter | SoapAdapter | IdocAdapter | JdbcAdapter | ProcessDirectAdapter | RfcAdapter | JmsAdapter;

    /**
     * Canonical ID mapping (AI ID → Component)
     * Used by validation to resolve Router route targets
     */
    private canonicalIdMap?: Map<string, Component>;

    /**
     * Creates a new IFlow instance
     * @param name - The name of the integration flow
     */
    constructor(name: string) {
        this.name = name;
    }

    /**
     * Adds a component to the integration flow
     * @param component - The component to add (Content Modifier, Router, etc.)
     * @returns this IFlow instance for method chaining (Fluent API)
     */
    public addComponent(component: Component): IFlow {
        this.components.push(component);
        return this;
    }

    /**
     * Connects two components with a sequence flow
     * @param from - The source component
     * @param to - The target component
     * @returns this IFlow instance for method chaining (Fluent API)
     */
    public connect(from: Component, to: Component): IFlow {
        this.connections.push(
            new Connection(from, to)
        );
        return this;
    }

    /**
     * Gets all components in this flow
     * @returns Array of all components added to this flow
     */
    public getComponents(): Component[] {
        return this.components;
    }

    /**
     * Gets all connections (sequence flows) in this flow
     * @returns Array of all connections between components
     */
    public getConnections(): Connection[] {
        return this.connections;
    }

    /**
     * Adds a resource to the integration flow
     * @param resource - The resource to add (Groovy script, mapping, schema, etc.)
     * @returns this IFlow instance for method chaining (Fluent API)
     *
     * @example
     * ```typescript
     * const flow = new IFlow("DataTransform");
     * const script = new GroovyResource("transform.groovy", scriptContent);
     * flow.addResource(script);
     * ```
     */
    public addResource(resource: Resource): IFlow {
        this.resources.push(resource);
        return this;
    }

    /**
     * Gets all resources in this flow
     * @returns Array of all resources (scripts, mappings, schemas, etc.)
     */
    public getResources(): Resource[] {
        return this.resources;
    }

    /**
     * Adds a Local Integration Process (subprocess) to the integration flow
     * @param subprocess - The Local Integration Process to add
     * @returns this IFlow instance for method chaining (Fluent API)
     */
    public addSubProcess(subprocess: LocalIntegrationProcess): IFlow {
        this.subProcesses.push(subprocess);
        return this;
    }

    /**
     * Gets all Local Integration Processes in this flow
     * @returns Array of all subprocesses added to this flow
     */
    public getSubProcesses(): LocalIntegrationProcess[] {
        return this.subProcesses;
    }

    /**
     * Adds an Exception Subprocess (error handler) to the integration flow
     * @param exceptionSubprocess - The Exception Subprocess to add
     * @returns this IFlow instance for method chaining (Fluent API)
     */
    public addExceptionSubprocess(exceptionSubprocess: ExceptionSubprocess): IFlow {
        this.exceptionSubprocesses.push(exceptionSubprocess);
        return this;
    }

    /**
     * Gets all Exception Subprocesses in this flow
     * @returns Array of all exception subprocesses added to this flow
     */
    public getExceptionSubprocesses(): ExceptionSubprocess[] {
        return this.exceptionSubprocesses;
    }

    /**
     * Sets the sender adapter for this integration flow
     * @param adapter - HTTP, OData, SFTP, SOAP, IDoc, Process Direct, or JMS sender adapter
     * @returns this IFlow instance for method chaining
     */
    public setSender(adapter: HttpAdapter | ODataAdapter | SftpAdapter | SoapAdapter | IdocAdapter | ProcessDirectAdapter | JmsAdapter): IFlow {
        this.sender = adapter;
        return this;
    }

    /**
     * Gets the sender adapter
     * @returns Sender adapter or undefined
     */
    public getSender(): HttpAdapter | ODataAdapter | SftpAdapter | SoapAdapter | IdocAdapter | ProcessDirectAdapter | JmsAdapter | undefined {
        return this.sender;
    }

    /**
     * Sets the receiver adapter for this integration flow
     * @param adapter - HTTP, OData, SFTP, SOAP, IDoc, JDBC, Process Direct, RFC, or JMS receiver adapter
     * @returns this IFlow instance for method chaining
     */
    public setReceiver(adapter: HttpAdapter | ODataAdapter | SftpAdapter | SoapAdapter | IdocAdapter | JdbcAdapter | ProcessDirectAdapter | RfcAdapter | JmsAdapter): IFlow {
        this.receiver = adapter;
        return this;
    }

    /**
     * Gets the receiver adapter
     * @returns Receiver adapter or undefined
     */
    public getReceiver(): HttpAdapter | ODataAdapter | SftpAdapter | SoapAdapter | IdocAdapter | JdbcAdapter | ProcessDirectAdapter | RfcAdapter | JmsAdapter | undefined {
        return this.receiver;
    }

    /**
     * Sets the canonical ID mapping for validation
     * @internal - Used by ComponentFactory
     */
    public setCanonicalIdMap(map: Map<string, Component>): void {
        this.canonicalIdMap = map;
    }

    /**
     * Resolves a canonical AI ID to its Component instance
     * Returns undefined if ID doesn't exist (flow adapter endpoint)
     */
    public resolveCanonicalId(id: string): Component | undefined {
        return this.canonicalIdMap?.get(id);
    }
}
