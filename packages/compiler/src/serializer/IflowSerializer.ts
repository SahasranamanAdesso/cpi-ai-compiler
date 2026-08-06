import * as fs from 'fs';
import * as path from 'path';
import { BpmnDefinitions } from "../ir/BpmnDefinitions";
import { BpmnWriter } from "../writer/BpmnWriter";

/**
 * IflowSerializer - Writes BPMN XML to .iflw file
 *
 * This handles file system operations:
 * - Creates directory structure
 * - Writes .iflw file
 *
 * Directory structure:
 *   src/main/resources/scenarioflows/integrationflow/
 *       HelloWorld.iflw
 */
export class IflowSerializer {

    private bpmnWriter = new BpmnWriter();

    /**
     * Serializes BpmnDefinitions to .iflw file
     *
     * @param definitions - The IR to serialize
     * @param outputDir - Base output directory (e.g., /tmp/HelloWorld)
     * @param flowName - Name of the flow (e.g., "HelloWorld")
     */
    serialize(definitions: BpmnDefinitions, outputDir: string, flowName: string): void {
        const iflowDir = path.join(
            outputDir,
            'src',
            'main',
            'resources',
            'scenarioflows',
            'integrationflow'
        );

        // Create directory structure
        fs.mkdirSync(iflowDir, { recursive: true });

        // Write BPMN XML
        const xml = this.bpmnWriter.write(definitions);
        const iflowPath = path.join(iflowDir, `${flowName}.iflw`);
        fs.writeFileSync(iflowPath, xml, 'utf-8');

        console.log(`✅ Generated ${iflowPath}`);
    }
}
