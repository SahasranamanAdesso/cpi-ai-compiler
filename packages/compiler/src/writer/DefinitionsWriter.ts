import { BpmnDefinitions } from "../ir/BpmnDefinitions";
import { CollaborationWriter } from "./CollaborationWriter";
import { ProcessWriter } from "./ProcessWriter";
import { BpmnDiagramWriter } from "./BpmnDiagramWriter";

/**
 * DefinitionsWriter - Writes root BPMN <definitions> element
 *
 * This is the root of the .iflw file with all required namespaces.
 *
 * Example output:
 *   <?xml version="1.0" encoding="UTF-8"?>
 *   <bpmn2:definitions
 *       xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
 *       xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
 *       xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
 *       xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
 *       xmlns:ifl="http:///com.sap.ifl.model/Ifl.xsd"
 *       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 *       id="Definitions_1">
 *       <collaboration>...</collaboration>
 *       <process>...</process>
 *       <bpmndi:BPMNDiagram>...</bpmndi:BPMNDiagram>
 *   </bpmn2:definitions>
 */
export class DefinitionsWriter {

    private collaborationWriter = new CollaborationWriter();
    private processWriter = new ProcessWriter();
    private diagramWriter = new BpmnDiagramWriter();

    write(definitions: BpmnDefinitions): string {
        const lines: string[] = [];

        // XML declaration
        lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);

        // Root element with namespaces
        const nsAttrs: string[] = [];
        definitions.namespaces.forEach((uri, prefix) => {
            nsAttrs.push(`xmlns:${prefix}="${uri}"`);
        });

        lines.push(`<bpmn2:definitions`);
        nsAttrs.forEach(attr => {
            lines.push(`    ${attr}`);
        });
        lines.push(`    id="${definitions.id}">`);

        // Collaboration
        lines.push(this.indent(this.collaborationWriter.write(definitions.collaboration), "    "));

        // Process
        lines.push(this.indent(this.processWriter.write(definitions.process), "    "));

        // BPMN Diagram (visual layout)
        if (definitions.diagram) {
            lines.push(this.indent(this.diagramWriter.write(definitions.diagram), "    "));
        }

        lines.push(`</bpmn2:definitions>`);

        return lines.join('\n');
    }

    private indent(text: string, indentStr: string): string {
        return text.split('\n').map(line => indentStr + line).join('\n');
    }
}
