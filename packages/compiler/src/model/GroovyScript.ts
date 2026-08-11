import { Component } from "./Component";

/**
 * GroovyScript - User-friendly API for SAP Groovy Script component
 *
 * Groovy Script is a processing component that executes Groovy code
 * to transform message content, set headers, or implement custom logic.
 *
 * In SAP Integration Suite:
 * - BPMN element: <callActivity activityType="Script">
 * - SAP uses subActivityType="GroovyScript" to distinguish from JavaScript
 * - Requires external .groovy file packaged in script/ directory
 * - Script has access to message context, headers, properties
 *
 * Architecture:
 * - This class extends Component with Groovy-specific defaults
 * - Registry metadata provides BPMN mapping and SAP properties
 * - Resource packaging handled by IflowPackager
 *
 * SAP-compatible metadata (verified against IPRO_PRODUCT_HTTP export):
 * - Property key is "script" (NOT "scriptReference")
 * - activityType: "Script" (NOT "ScriptCollection")
 * - subActivityType: "GroovyScript"
 * - componentVersion: "1.1"
 * - cmdVariantUri: ctype::FlowstepVariant/cname::GroovyScript/version::1.1.2
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
 *       <value>Script</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>subActivityType</key>
 *       <value>GroovyScript</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>script</key>
 *       <value>transformOrder.groovy</value>
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
     * @param id - Optional component ID (auto-generated if not provided)
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
        additionalProperties: Record<string, any> = {},
        id?: string
    ) {
        // Use provided ID or generate unique ID
        const componentId = id || `Script_${Date.now()}`;

        // SAP property key is "script" NOT "scriptReference"
        // Evidence: IPRO_PRODUCT_HTTP.iflw line 739
        // Script value is filename only, NOT full path
        const properties = {
            script: scriptName,
            ...additionalProperties
        };

        // Create Component with ScriptCollection type (registry key)
        // Registry metadata will inject: activityType="Script", subActivityType="GroovyScript",
        // cmdVariantUri, componentVersion, scriptFunction, scriptBundleId
        super(componentId, name, "ScriptCollection", properties);
    }

    /**
     * Gets the script filename
     *
     * @returns The Groovy script filename (e.g., "transform.groovy")
     */
    public getScriptName(): string {
        return this.properties.script as string;
    }

    /**
     * Gets the script reference path
     *
     * @returns The full script reference path (e.g., "script/transform.groovy")
     */
    public getScriptReference(): string {
        return `script/${this.properties.script}` as string;
    }
}
