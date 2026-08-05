import { Component } from "./Component";
import { Connection } from "./Connection";

/**
 * LocalIntegrationProcess - Reusable subprocess within an integration flow
 *
 * A Local Integration Process is a callable subprocess that encapsulates
 * reusable integration logic. It can be invoked from the main process or
 * other local processes using the ProcessCall component.
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:subProcess processType="directCall">
 * - Contains its own start event, end event, and processing components
 * - Callable via ProcessCall component
 * - Enables modular, reusable integration patterns
 *
 * Architecture:
 * - Similar to main IFlow but as a subprocess
 * - Has its own component chain
 * - Returns control to caller upon completion
 *
 * Example usage:
 * ```typescript
 * // Create a reusable data lookup subprocess
 * const subprocess = new LocalIntegrationProcess("DataLookup");
 *
 * // Add components to subprocess
 * const lookup = new Component(...);
 * subprocess.addComponent(lookup);
 *
 * // Add subprocess to main flow
 * flow.addSubProcess(subprocess);
 *
 * // Call it from main process
 * const processCall = new ProcessCall("Call Data Lookup", subprocess.id);
 * flow.addComponent(processCall);
 * ```
 *
 * SAP Evidence:
 * - BPMN: POC.iflw lines 530-546
 * - processType: "directCall"
 * - cmdVariantUri: ctype::FlowElementVariant/cname::LocalIntegrationProcess/version::1.1.3
 * - componentVersion: "1.1"
 */
export class LocalIntegrationProcess {
    public readonly id: string;
    public readonly name: string;
    public readonly components: Component[];
    public readonly connections: Connection[];
    public readonly properties: Record<string, any>;

    /**
     * Creates a new Local Integration Process
     *
     * @param name - Display name for the subprocess (e.g., "DataLookup", "ErrorHandler")
     * @param transactionalHandling - Transaction handling mode:
     *   - "From Calling Process" (default): Inherits transaction from caller
     *   - "Required for JDBC": Creates new transaction for database operations
     *   - "Not Required": No transaction management
     * @param additionalProperties - Optional additional SAP properties
     */
    constructor(
        name: string,
        transactionalHandling: string = "From Calling Process",
        additionalProperties: Record<string, any> = {}
    ) {
        this.id = `Process_${Date.now()}`;
        this.name = name;
        this.components = [];
        this.connections = [];

        this.properties = {
            processType: "directCall",
            transactionalHandling: transactionalHandling,
            ...additionalProperties
        };
    }

    /**
     * Adds a component to the subprocess
     *
     * @param component - Processing component (Content Modifier, Groovy, etc.)
     */
    public addComponent(component: Component): void {
        this.components.push(component);
    }

    /**
     * Connects two components with a sequence flow
     *
     * @param source - Source component
     * @param target - Target component
     */
    public connect(source: Component, target: Component): void {
        const connection = new Connection(source, target);
        this.connections.push(connection);
    }

    /**
     * Gets all components in the subprocess
     *
     * @returns Array of components
     */
    public getComponents(): Component[] {
        return this.components;
    }

    /**
     * Gets all connections in the subprocess
     *
     * @returns Array of connections
     */
    public getConnections(): Connection[] {
        return this.connections;
    }

    /**
     * Creates a Local Integration Process with JDBC transaction handling
     *
     * Used when subprocess performs database operations that require
     * transactional consistency.
     *
     * @param name - Display name
     * @returns LocalIntegrationProcess with JDBC transaction handling
     */
    static withJdbcTransaction(name: string): LocalIntegrationProcess {
        return new LocalIntegrationProcess(name, "Required for JDBC");
    }

    /**
     * Creates a Local Integration Process without transaction management
     *
     * Used for lightweight subprocesses that don't require transactions.
     *
     * @param name - Display name
     * @returns LocalIntegrationProcess without transactions
     */
    static withoutTransaction(name: string): LocalIntegrationProcess {
        return new LocalIntegrationProcess(name, "Not Required");
    }
}
