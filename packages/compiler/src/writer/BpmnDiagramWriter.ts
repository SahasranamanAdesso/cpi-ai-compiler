import { BpmnDiagram } from "../ir/BpmnDiagram";

/**
 * BpmnDiagramWriter - Writes BPMN Diagram Interchange elements
 *
 * This generates the visual layout information required by SAP Integration Suite
 * graphical editor. Without this, the editor cannot render the flow.
 *
 * Structure:
 *   <bpmndi:BPMNDiagram id="..." name="...">
 *     <bpmndi:BPMNPlane bpmnElement="Collaboration_1" id="...">
 *       <bpmndi:BPMNShape ...>
 *         <dc:Bounds .../>
 *       </bpmndi:BPMNShape>
 *       <bpmndi:BPMNEdge ...>
 *         <di:waypoint .../>
 *         <di:waypoint .../>
 *       </bpmndi:BPMNEdge>
 *     </bpmndi:BPMNPlane>
 *   </bpmndi:BPMNDiagram>
 */
export class BpmnDiagramWriter {

    write(diagram: BpmnDiagram): string {
        const lines: string[] = [];

        lines.push(`<bpmndi:BPMNDiagram id="${diagram.id}" name="${this.escape(diagram.name)}">`);
        lines.push(`    <bpmndi:BPMNPlane bpmnElement="${diagram.planeElement}" id="${diagram.planeId}">`);

        // Write all shapes
        diagram.shapes.forEach(shape => {
            lines.push(`        <bpmndi:BPMNShape bpmnElement="${shape.bpmnElement}" id="BPMNShape_${shape.bpmnElement}">`);
            lines.push(`            <dc:Bounds height="${shape.height.toFixed(1)}" width="${shape.width.toFixed(1)}" x="${shape.x.toFixed(1)}" y="${shape.y.toFixed(1)}"/>`);
            lines.push(`        </bpmndi:BPMNShape>`);
        });

        // Write all edges
        diagram.edges.forEach(edge => {
            lines.push(`        <bpmndi:BPMNEdge bpmnElement="${edge.bpmnElement}" id="BPMNEdge_${edge.bpmnElement}" sourceElement="${edge.sourceElement}" targetElement="${edge.targetElement}">`);
            edge.waypoints.forEach(waypoint => {
                lines.push(`            <di:waypoint x="${waypoint.x.toFixed(1)}" xsi:type="dc:Point" y="${waypoint.y.toFixed(1)}"/>`);
            });
            lines.push(`        </bpmndi:BPMNEdge>`);
        });

        lines.push(`    </bpmndi:BPMNPlane>`);
        lines.push(`</bpmndi:BPMNDiagram>`);

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
