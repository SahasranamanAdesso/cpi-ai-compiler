import { Component } from "./Component";

/**
 * Route - Represents a single routing path with a condition
 *
 * Each route defines:
 * - condition: The routing expression (e.g., "${header.type} == 'A'")
 * - target: The next component ID to route to
 * - name: Optional human-readable name for this route
 */
export interface Route {
    condition: string;
    target?: string;
    name?: string;
}

/**
 * Router - User-friendly API for SAP Router component (Exclusive Gateway)
 *
 * Router is a flow-control component that implements conditional routing
 * based on message content, headers, or properties.
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:exclusiveGateway>
 * - Routes messages to different branches based on conditions
 * - Only one route is executed (exclusive routing)
 * - Supports default/otherwise route for unmatched conditions
 *
 * Unlike CallActivity-based components (Content Modifier, Groovy Script),
 * Router is a pure BPMN Gateway element without SAP-specific metadata.
 *
 * Example usage:
 * ```typescript
 * const router = new Router("Route Orders");
 *
 * router
 *   .when("${header.type} == 'A'")
 *   .to(componentA)
 *   .when("${header.type} == 'B'")
 *   .to(componentB)
 *   .otherwise()
 *   .to(defaultComponent);
 * ```
 *
 * Generated BPMN:
 * ```xml
 * <bpmn2:exclusiveGateway id="Gateway_1" name="Route Orders">
 *   <bpmn2:incoming>SequenceFlow_1</bpmn2:incoming>
 *   <bpmn2:outgoing>SequenceFlow_2</bpmn2:outgoing>
 *   <bpmn2:outgoing>SequenceFlow_3</bpmn2:outgoing>
 *   <bpmn2:outgoing>SequenceFlow_4</bpmn2:outgoing>
 * </bpmn2:exclusiveGateway>
 *
 * <bpmn2:sequenceFlow id="SequenceFlow_2" sourceRef="Gateway_1" targetRef="Component_A">
 *   <bpmn2:conditionExpression>${header.type} == 'A'</bpmn2:conditionExpression>
 * </bpmn2:sequenceFlow>
 * ```
 */
export class Router extends Component {

    private routes: Route[] = [];
    private defaultRoute?: Route;
    private currentRouteBuilder?: Partial<Route>;

    /**
     * Creates a new Router component
     *
     * @param name - Human-readable name for this router
     * @param properties - Optional additional properties
     * @param id - Optional component ID (auto-generated if not provided)
     *
     * @example
     * ```typescript
     * // Basic usage
     * const router = new Router("Route by Country");
     *
     * // With properties
     * const router = new Router("Route by Country", {
     *     description: "Routes orders based on country code"
     * });
     * ```
     */
    constructor(
        name: string,
        properties: Record<string, any> = {},
        id?: string
    ) {
        // Use provided ID or generate unique ID
        const componentId = id || `Gateway_${Date.now()}`;

        // Create Component with Router type
        // Registry maps Router → exclusiveGateway (no metadata needed)
        super(componentId, name, "Router", properties);
    }

    /**
     * Adds a conditional route
     *
     * @param condition - Routing expression (e.g., "${header.Country} == 'IN'")
     * @returns This router instance for method chaining
     *
     * @example
     * ```typescript
     * router
     *   .when("${header.type} == 'urgent'")
     *   .to(priorityHandler);
     * ```
     */
    public when(condition: string): this {
        // Finalize any pending route
        this.finalizePendingRoute();

        // Start building new route
        this.currentRouteBuilder = { condition };
        return this;
    }

    /**
     * Sets the target for the current route
     *
     * @param target - Target component ID or Component instance
     * @returns This router instance for method chaining
     *
     * @example
     * ```typescript
     * router
     *   .when("${header.type} == 'A'")
     *   .to("Component_A");
     * ```
     */
    public to(target: string | Component): this {
        if (!this.currentRouteBuilder) {
            throw new Error("Call when() or otherwise() before to()");
        }

        // Extract component ID if Component instance
        const targetId = typeof target === 'string' ? target : target.id;

        // Set target on current route builder
        this.currentRouteBuilder.target = targetId;

        // Finalize the route
        this.finalizePendingRoute();

        return this;
    }

    /**
     * Adds a default/otherwise route for unmatched conditions
     *
     * @returns This router instance for method chaining
     *
     * @example
     * ```typescript
     * router
     *   .when("${header.type} == 'A'")
     *   .to(componentA)
     *   .otherwise()
     *   .to(defaultComponent);
     * ```
     */
    public otherwise(): this {
        // Finalize any pending route
        this.finalizePendingRoute();

        // Start building default route (no condition)
        this.currentRouteBuilder = { condition: "" };
        return this;
    }

    /**
     * Finalizes any pending route and adds it to the routes list
     */
    private finalizePendingRoute(): void {
        if (!this.currentRouteBuilder) {
            return;
        }

        const route = this.currentRouteBuilder as Route;

        // Check if this is a default route (no condition)
        if (!route.condition || route.condition === "") {
            this.defaultRoute = route;
        } else {
            this.routes.push(route);
        }

        // Clear the builder
        this.currentRouteBuilder = undefined;
    }

    /**
     * Gets all defined routes
     *
     * @returns Array of routes with conditions
     */
    public getRoutes(): Route[] {
        // Finalize any pending route before returning
        this.finalizePendingRoute();
        return this.routes;
    }

    /**
     * Gets the default route (if defined)
     *
     * @returns Default route or undefined
     */
    public getDefaultRoute(): Route | undefined {
        // Finalize any pending route before returning
        this.finalizePendingRoute();
        return this.defaultRoute;
    }

    /**
     * Gets all routes including the default route
     *
     * @returns Array of all routes
     */
    public getAllRoutes(): Route[] {
        const allRoutes = [...this.getRoutes()];
        if (this.defaultRoute) {
            allRoutes.push(this.defaultRoute);
        }
        return allRoutes;
    }
}
