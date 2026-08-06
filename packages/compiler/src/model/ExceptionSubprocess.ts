import { Component } from "./Component";
import { Connection } from "./Connection";

/**
 * ExceptionSubprocess - Error handling subprocess
 *
 * An Exception Subprocess is a special subprocess that handles errors occurring
 * in the main integration flow. It's triggered automatically when an exception
 * is thrown and contains error handling logic (logging, notifications, cleanup).
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:subProcess activityType="ErrorEventSubProcessTemplate">
 * - Contains ErrorStartEvent (triggered by exceptions)
 * - Contains error handling components
 * - Contains ErrorEndEvent (terminates error handling)
 * - Multiple exception subprocesses can exist in one flow
 *
 * Architecture:
 * - Triggered automatically on error (not called explicitly)
 * - Has access to error context via ${exception} variable
 * - Can perform cleanup, logging, notification, etc.
 * - Terminates integration flow execution
 *
 * Example usage:
 * ```typescript
 * // Create exception handler
 * const exceptionHandler = new ExceptionSubprocess("Error Handler");
 *
 * // Add error logging
 * const logError = new Component(
 *     "LogError",
 *     "Log Exception",
 *     "Enricher",
 *     {
 *         propertyTable: "<row><cell>Create</cell><cell>expression</cell><cell>${exception.message}</cell><cell>ErrorMessage</cell></row>"
 *     }
 * );
 * exceptionHandler.addComponent(logError);
 *
 * // Add to main flow
 * flow.addSubProcess(exceptionHandler);
 * ```
 *
 * SAP Evidence:
 * - BPMN: POC.iflw lines 648-755
 * - activityType: "ErrorEventSubProcessTemplate"
 * - cmdVariantUri: ctype::FlowstepVariant/cname::ErrorEventSubProcessTemplate/version::1.1.0
 * - componentVersion: "1.1"
 */
export class ExceptionSubprocess {
    public readonly id: string;
    public readonly name: string;
    public readonly components: Component[];
    public readonly connections: Connection[];
    public readonly properties: Record<string, any>;

    /**
     * Creates a new Exception Subprocess
     *
     * @param name - Display name for the error handler (e.g., "Error Handler", "Exception Subprocess 1")
     * @param additionalProperties - Optional additional SAP properties
     *
     * The subprocess automatically:
     * - Creates ErrorStartEvent (triggered on exceptions)
     * - Creates ErrorEndEvent (terminates flow after handling)
     * - Sets activityType to "ErrorEventSubProcessTemplate"
     */
    constructor(
        name: string,
        additionalProperties: Record<string, any> = {}
    ) {
        this.id = `SubProcess_${Date.now()}`;
        this.name = name;
        this.components = [];
        this.connections = [];

        this.properties = {
            activityType: "ErrorEventSubProcessTemplate",
            ...additionalProperties
        };
    }

    /**
     * Adds a component to the exception subprocess
     *
     * Common error handling components:
     * - Content Modifier: Log error details (${exception.message})
     * - Groovy Script: Custom error processing
     * - Send Mail: Error notification
     * - Data Store: Store failed message for retry
     *
     * @param component - Processing component
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
     * Gets the error start event name
     *
     * @returns Name for the error start event
     */
    public getErrorStartEventName(): string {
        return `Error Start ${this.name}`;
    }

    /**
     * Gets the error end event name
     *
     * @returns Name for the error end event
     */
    public getErrorEndEventName(): string {
        return `Error End ${this.name}`;
    }
}
