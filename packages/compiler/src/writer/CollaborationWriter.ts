import { BpmnCollaboration } from "../ir/BpmnCollaboration";
import { PropertyWriter } from "./PropertyWriter";

/**
 * CollaborationWriter - Writes BPMN <bpmn2:collaboration> element
 */
export class CollaborationWriter {

    private propertyWriter = new PropertyWriter();

    write(collaboration: BpmnCollaboration): string {
        const lines: string[] = [];

        lines.push(`<bpmn2:collaboration id="${collaboration.id}" name="${this.escape(collaboration.name)}">`);

        // Collaboration-level properties
        if (collaboration.properties.length > 0) {
            lines.push(`    <bpmn2:extensionElements>`);
            lines.push(this.propertyWriter.writeAll(collaboration.properties, "        "));
            lines.push(`    </bpmn2:extensionElements>`);
        }

        // Participants
        collaboration.participants.forEach(participant => {
            const attrs: string[] = [
                `id="${participant.id}"`,
                `ifl:type="${participant.iflType}"`,
                `name="${this.escape(participant.name)}"`
            ];

            if (participant.processRef) {
                attrs.push(`processRef="${participant.processRef}"`);
            }

            lines.push(`    <bpmn2:participant ${attrs.join(' ')}>`);
            lines.push(`        <bpmn2:extensionElements>`);

            if (participant.properties.length > 0) {
                lines.push(this.propertyWriter.writeAll(participant.properties, "            "));
            }

            lines.push(`        </bpmn2:extensionElements>`);
            lines.push(`    </bpmn2:participant>`);
        });

        // Message flows
        collaboration.messageFlows.forEach(messageFlow => {
            const attrs = [
                `id="${messageFlow.id}"`,
                `name="${this.escape(messageFlow.name)}"`,
                `sourceRef="${messageFlow.sourceRef}"`,
                `targetRef="${messageFlow.targetRef}"`
            ];

            const props = messageFlow.getProperties ? messageFlow.getProperties() : messageFlow.properties;
            const propKeys = Object.keys(props);

            if (propKeys.length === 0) {
                lines.push(`    <bpmn2:messageFlow ${attrs.join(' ')}/>`);
            } else {
                lines.push(`    <bpmn2:messageFlow ${attrs.join(' ')}>`);
                lines.push(`        <bpmn2:extensionElements>`);
                // Convert properties object to IflProperty array
                const iflProps = propKeys.map(key => ({ key, value: props[key] }));
                lines.push(this.propertyWriter.writeAll(iflProps, "            "));
                lines.push(`        </bpmn2:extensionElements>`);
                lines.push(`    </bpmn2:messageFlow>`);
            }
        });

        lines.push(`</bpmn2:collaboration>`);

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
