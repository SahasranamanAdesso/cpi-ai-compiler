import { BpmnNode } from "../ir/BpmnNode";
import { PropertyWriter } from "./PropertyWriter";

/**
 * CallActivityWriter - Generic writer for BPMN <bpmn2:callActivity> XML
 *
 * This writer generates CallActivity elements for ALL SAP processing components
 * without hardcoding component-specific logic.
 *
 * Processing Component Family:
 * - Content Modifier (Enricher)
 * - Router
 * - Groovy Script (ScriptCollection)
 * - Data Store (DBStorage)
 * - And future components...
 *
 * How it works:
 * 1. ComponentMapper merges Registry metadata with user properties
 * 2. BpmnNode properties contain complete configuration
 * 3. CallActivityWriter generates XML from those properties
 * 4. No defaults, no hardcoding, no component-specific logic
 *
 * All components share the same BPMN structure:
 * - <bpmn2:callActivity> element
 * - <ifl:property> extension elements for SAP-specific configuration
 * - incoming/outgoing sequence flow references
 *
 * Differentiation happens through metadata:
 * - activityType (Enricher, Router, ScriptCollection, etc.)
 * - cmdVariantUri (component variant reference)
 * - componentVersion (component version)
 * - Component-specific configuration properties
 *
 * This design eliminates duplication and makes adding new components trivial
 * (just add Registry metadata, no code changes).
 */
export class CallActivityWriter {

    private propertyWriter = new PropertyWriter();

    write(
        node: BpmnNode,
        incoming: string[],
        outgoing: string[]
    ): string {
        const lines: string[] = [];

        lines.push(`<bpmn2:callActivity id="${node.id}" name="${this.escape(node.name)}">`);

        lines.push(`    <bpmn2:extensionElements>`);

        // Write all properties from node (metadata already merged by ComponentMapper)
        // No defaults, no hardcoding - properties come from Registry metadata
        const properties = node.properties;

        // Write all properties as ifl:property elements
        Object.entries(properties).forEach(([key, value]) => {
            lines.push(`        <ifl:property>`);
            lines.push(`            <key>${key}</key>`);
            lines.push(`            <value>${this.escape(String(value))}</value>`);
            lines.push(`        </ifl:property>`);
        });

        lines.push(`    </bpmn2:extensionElements>`);

        incoming.forEach(flowId => {
            lines.push(`    <bpmn2:incoming>${flowId}</bpmn2:incoming>`);
        });

        outgoing.forEach(flowId => {
            lines.push(`    <bpmn2:outgoing>${flowId}</bpmn2:outgoing>`);
        });

        lines.push(`</bpmn2:callActivity>`);

        return lines.join('\n');
    }

    private escape(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
