/**
 * Public API - Compile functions
 *
 * High-level API for compiling IFlow models to SAP .iflw ZIP artifacts
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { IFlow } from '../model/IFlow';
import { BpmnProcessMapper } from '../mapper/BpmnProcessMapper';
import { IflowSerializer } from '../serializer/IflowSerializer';
import { IflowPackager } from '../packager/IflowPackager';

/**
 * Compile an IFlow to BPMN XML string
 *
 * @param flow - IFlow model instance
 * @returns BPMN XML as Buffer
 *
 * @example
 * ```typescript
 * const flow = new IFlow("OrderProcessing");
 * // ... build flow
 * const bpmnXml = await compile(flow);
 * fs.writeFileSync("output.iflw", bpmnXml);
 * ```
 */
export async function compile(flow: IFlow): Promise<Buffer> {
    // Map IFlow to BPMN IR
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);

    // Serialize to XML
    const { BpmnWriter } = await import('../writer/BpmnWriter');
    const writer = new BpmnWriter();
    const xml = writer.write(definitions);

    return Buffer.from(xml, 'utf-8');
}

/**
 * Compile an IFlow to complete SAP Integration Flow ZIP package
 *
 * This is the primary API - generates a complete .zip artifact ready for
 * import into SAP Integration Suite.
 *
 * @param flow - IFlow model instance
 * @returns ZIP file as Buffer
 *
 * @example
 * ```typescript
 * const flow = new IFlow("OrderProcessing");
 * const sender = HttpAdapter.sender({address: "/api/orders"});
 * const receiver = HttpAdapter.receiver({url: "https://example.com"});
 * flow.setSender(sender);
 * flow.setReceiver(receiver);
 *
 * const zipBuffer = await compileToZip(flow);
 * fs.writeFileSync("OrderProcessing.zip", zipBuffer);
 * ```
 */
export async function compileToZip(flow: IFlow): Promise<Buffer> {
    const flowName = flow.name;
    const tempDir = path.join(os.tmpdir(), `iflow_${Date.now()}`);
    let outputZip: string | undefined;

    try {
        // 1. Map IFlow to BPMN IR
        const mapper = new BpmnProcessMapper();
        const definitions = mapper.map(flow);

        // 2. Serialize to .iflw file
        fs.mkdirSync(tempDir, { recursive: true });
        const serializer = new IflowSerializer();
        serializer.serialize(definitions, tempDir, flowName);

        // 3. Package to ZIP with resources
        // IMPORTANT: output ZIP must be outside tempDir to avoid nested ZIP
        outputZip = path.join(os.tmpdir(), `iflow_${Date.now()}_${flowName}.zip`);
        const packager = new IflowPackager();
        const resources = flow.getResources();
        await packager.package(tempDir, flowName, outputZip, resources);

        // 4. Read ZIP into buffer
        const zipBuffer = fs.readFileSync(outputZip);

        return zipBuffer;
    } finally {
        // Cleanup temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        // Cleanup output ZIP
        if (outputZip && fs.existsSync(outputZip)) {
            fs.rmSync(outputZip, { force: true });
        }
    }
}
