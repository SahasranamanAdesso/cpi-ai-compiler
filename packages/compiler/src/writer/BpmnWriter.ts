import { BpmnDefinitions } from "../ir/BpmnDefinitions";
import { DefinitionsWriter } from "./DefinitionsWriter";

/**
 * BpmnWriter - Main orchestrator for BPMN XML generation
 *
 * This is the entry point for the XML backend.
 * Delegates to specialized writers for each BPMN element.
 *
 * Architecture:
 *   BpmnDefinitions (IR)
 *        ↓
 *   BpmnWriter ← We are here
 *        ↓
 *   DefinitionsWriter
 *        ↓
 *   CollaborationWriter, ProcessWriter
 *        ↓
 *   PropertyWriter, EventWriter, CallActivityWriter
 *        ↓
 *   Complete .iflw XML
 */
export class BpmnWriter {

    private definitionsWriter = new DefinitionsWriter();

    /**
     * Writes BpmnDefinitions to complete BPMN XML
     *
     * @param definitions - The IR to serialize
     * @returns Complete XML string for .iflw file
     */
    write(definitions: BpmnDefinitions): string {
        return this.definitionsWriter.write(definitions);
    }
}
