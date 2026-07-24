import { Component } from "./Component";

/**
 * GroovyScript - User-friendly API for SAP Groovy Script component
 *
 * Groovy Script is a processing component that executes Groovy code
 * to transform message content, set headers, or implement custom logic.
 *
 * In SAP Integration Suite:
 * - BPMN element: <callActivity activityType="ScriptCollection">
 * - Requires external .groovy file packaged in script/ directory
 * - Script has access to message context, headers, properties
 *
 * Architecture:
 * - This class extends Component with Groovy-specific defaults
 * - Registry metadata provides BPMN mapping and SAP properties
 * - Resource packaging handled by IflowPackager
 *
 * Example usage:
 * ```typescript
 * const transform = new GroovyScript(
 *     "Transform Order",
 *     "transformOrder.groovy"
 * );
 * ```
 *
 * Generated BPMN:
 * ```xml
 * <bpmn2:callActivity id="Script_1" name="Transform Order">
 *   <bpmn2:extensionElements>
 *     <ifl:property>
 *       <key>activityType</key>
 *       <value>ScriptCollection</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>scriptReference</key>
 *       <value>script/transformOrder.groovy</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>operation</key>
 *       <value>Execute</value>
 *     </ifl:property>
 *   </bpmn2:extensionElements>
 * </bpmn2:callActivity>
 * ```
 */
export class GroovyScript extends Component {

    /**
     * Creates a new Groovy Script component
     *
     * @param name - Human-readable name for this script step
     * @param scriptName - Filename of the Groovy script (e.g., "transform.groovy")
     * @param additionalProperties - Optional additional SAP properties
     *
     * @example
     * ```typescript
     * // Basic usage
     * const script = new GroovyScript(
     *     "Transform Message",
     *     "transform.groovy"
     * );
     *
     * // With additional properties
     * const script = new GroovyScript(
     *     "Transform Message",
     *     "transform.groovy",
     *     { description: "Transforms order XML to JSON" }
     * );
     * ```
     */
    constructor(
        name: string,
        scriptName: string,
        additionalProperties: Record<string, any> = {}
    ) {
        // Generate unique ID for this component
        const id = `Script_${Date.now()}`;

        // Build scriptReference path following SAP conventions
        const scriptReference = `script/${scriptName}`;

        // Merge script reference with additional properties
        const properties = {
            scriptReference,
            ...additionalProperties
        };

        // Create Component with ScriptCollection type
        // Registry metadata will inject: activityType, operation, cmdVariantUri, componentVersion
        super(id, name, "ScriptCollection", properties);
    }

    /**
     * Gets the script filename
     *
     * @returns The Groovy script filename (e.g., "transform.groovy")
     */
    public getScriptName(): string {
        const scriptReference = this.properties.scriptReference as string;
        return scriptReference.split('/').pop() || '';
    }

    /**
     * Gets the script reference path
     *
     * @returns The full script reference path (e.g., "script/transform.groovy")
     */
    public getScriptReference(): string {
        return this.properties.scriptReference as string;
    }
}
