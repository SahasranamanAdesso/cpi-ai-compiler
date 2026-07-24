import { Component } from "./Component";
import { Connection } from "./Connection";
import { Resource } from "./Resource";

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
}
