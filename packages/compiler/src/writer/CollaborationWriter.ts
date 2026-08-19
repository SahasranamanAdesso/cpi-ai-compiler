import { BpmnCollaboration } from "../ir/BpmnCollaboration";
import { PropertyWriter } from "./PropertyWriter";
import { toXmlTechnicalName } from "../utils/XmlName";

/**
 * CollaborationWriter - Writes BPMN <bpmn2:collaboration> element
 *
 * This is the single point where every messageFlow's "Channel Name" (SAP's
 * term for the sender/receiver/adapter identifier shown on the connecting
 * line) actually gets serialized into the .iflw, regardless of which
 * adapter class (HttpAdapter, JdbcAdapter, SoapAdapter, ...) or mapper code
 * produced the BpmnMessageFlow. Upstream adapter classes already sanitize
 * their own channel name at construction time, but that only protects
 * callers who go through those classes -- a hand-built IFlow, a future
 * adapter, or a mapper-level default (e.g. the literal "HTTPS"/"HTTP"
 * fallback used when no sender/receiver is configured) could still reach
 * this writer with an unsanitized value. Running every messageFlow name
 * through the same toXmlTechnicalName() utility here, one time, at the
 * point of serialization, guarantees the "no whitespace / valid XML
 * NCName" invariant holds for the final .iflw no matter how the value got
 * here -- instead of depending on every current and future call site to
 * remember to sanitize before constructing a BpmnMessageFlow.
 *
 * Participant names are NOT run through this: real SAP exports show the
 * "Integration Process" participant with a space in its name (evidence:
 * every reference .iflw captured in this repo), so participant `name` is
 * not XML-NCName-constrained the way messageFlow `name` is -- sanitizing
 * it would be an unrequested, unevidenced behavior change to a field SAP
 * already accepts as free text.
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
            // Final safety-net normalization -- see class doc. Idempotent for
            // names that are already sanitized upstream (the common case).
            const channelName = toXmlTechnicalName(messageFlow.name, messageFlow.id);
            const attrs = [
                `id="${messageFlow.id}"`,
                `name="${this.escape(channelName)}"`,
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
