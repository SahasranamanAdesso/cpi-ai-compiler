import * as fs from 'fs';
import * as path from 'path';
import { ZipArchive } from 'archiver';
import { Resource } from '../model/Resource';

/**
 * IflowPackager - Creates complete CPI artifact
 *
 * Generates all required files:
 * - MANIFEST.MF
 * - .project
 * - metainfo.prop
 * - parameters.prop
 * - parameters.propdef
 * - Resources (Groovy scripts, mappings, schemas)
 * - ZIP archive
 *
 * Directory structure:
 *   HelloWorld/
 *       META-INF/
 *           MANIFEST.MF
 *       .project
 *       src/main/resources/
 *           metainfo.prop
 *           parameters.prop
 *           parameters.propdef
 *           scenarioflows/integrationflow/
 *               HelloWorld.iflw
 *           script/              (if Groovy scripts present)
 *               transform.groovy
 *           mapping/             (if mappings present)
 *               CustomerMapping.mmap
 */
export class IflowPackager {

    /**
     * Packages a complete CPI artifact
     *
     * @param flowDir - Directory containing .iflw file (e.g., /tmp/HelloWorld)
     * @param flowName - Name of the flow (e.g., "HelloWorld")
     * @param outputZip - Output ZIP path (e.g., /tmp/HelloWorld.zip)
     * @param resources - Optional array of resources to package (scripts, mappings, schemas)
     */
    async package(
        flowDir: string,
        flowName: string,
        outputZip: string,
        resources?: Resource[]
    ): Promise<void> {

        // Create MANIFEST.MF
        this.createManifest(flowDir, flowName);

        // Create .project
        this.createProject(flowDir, flowName);

        // Create metainfo.prop
        this.createMetainfo(flowDir, flowName);

        // Create parameters.prop and parameters.propdef
        this.createParameters(flowDir);

        // Package resources if provided
        if (resources && resources.length > 0) {
            this.packageResources(flowDir, resources);
        }

        // Create ZIP
        await this.createZip(flowDir, outputZip);

        console.log(`✅ Generated ${outputZip}`);
    }

    private createManifest(flowDir: string, flowName: string): void {
        const metaInfDir = path.join(flowDir, 'META-INF');
        fs.mkdirSync(metaInfDir, { recursive: true });

        const symbolicName = flowName.replace(/\s+/g, '_');
        const manifest = [
            'Manifest-Version: 1.0',
            'Bundle-ManifestVersion: 2',
            `Bundle-Name: ${flowName}`,
            `Bundle-SymbolicName: ${symbolicName}; singleton:=true`,
            'Bundle-Version: 1.0.0',
            'SAP-BundleType: IntegrationFlow',
            'SAP-NodeType: IFLMAP',
            'SAP-RuntimeProfile: iflmap',
            'Import-Package: com.sap.esb.application.services.cxf.interceptor,com.sap',
            ' .esb.security,com.sap.it.op.agent.api,com.sap.it.op.agent.collector.cam',
            ' el,com.sap.it.op.agent.collector.cxf,com.sap.it.op.agent.mpl,javax.jms,',
            ' javax.jws,javax.wsdl,javax.xml.bind.annotation,javax.xml.namespace,java',
            ' x.xml.ws,org.apache.camel,org.apache.camel.builder,org.apache.camel.com',
            ' ponent.cxf,org.apache.camel.model,org.apache.camel.processor,org.apache',
            ' .camel.processor.aggregate,org.apache.camel.spring.spi,org.apache.commo',
            ' ns.logging,org.apache.cxf.binding,org.apache.cxf.binding.soap,org.apach',
            ' e.cxf.binding.soap.spring,org.apache.cxf.bus,org.apache.cxf.bus.resourc',
            ' e,org.apache.cxf.bus.spring,org.apache.cxf.buslifecycle,org.apache.cxf.',
            ' catalog,org.apache.cxf.configuration.jsse,org.apache.cxf.configuration.',
            ' spring,org.apache.cxf.endpoint,org.apache.cxf.headers,org.apache.cxf.in',
            ' terceptor,org.apache.cxf.management.jmx,org.apache.cxf.phase,org.apache',
            ' .cxf.resource,org.apache.cxf.service.factory,org.apache.cxf.service.mod',
            ' el,org.apache.cxf.transport,org.apache.cxf.transport.common.gzip,org.ap',
            ' ache.cxf.transport.http,org.apache.cxf.transport.http.policy,org.apache',
            ' .cxf.ws.rm.policy,org.apache.cxf.ws.security.wss4j,org.apache.cxf.wsdl,',
            ' org.apache.cxf.wsdl11,org.osgi.framework;version=1.3.0,org.osgi.service',
            ' .blueprint;version="[1.0.0,2.0.0)",org.slf4j;version="1.6",org.springfr',
            ' amework.beans.factory.config;version="3.0"',
            ''
        ].join('\n');

        const manifestPath = path.join(metaInfDir, 'MANIFEST.MF');
        fs.writeFileSync(manifestPath, manifest, 'utf-8');
    }

    private createProject(flowDir: string, flowName: string): void {
        const projectName = flowName.replace(/\s+/g, '_');
        const project = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<projectDescription>',
            `    <name>${projectName}</name>`,
            '    <comment/>',
            '    <projects/>',
            '    <buildSpec>',
            '        <buildCommand>',
            '            <name>org.eclipse.jdt.core.javabuilder</name>',
            '            <arguments/>',
            '        </buildCommand>',
            '    </buildSpec>',
            '    <natures>',
            '        <nature>org.eclipse.jdt.core.javanature</nature>',
            '        <nature>com.sap.ide.ifl.project.support.project.nature</nature>',
            '        <nature>com.sap.ide.ifl.bsn</nature>',
            '    </natures>',
            '</projectDescription>',
            ''
        ].join('\n');

        const projectPath = path.join(flowDir, '.project');
        fs.writeFileSync(projectPath, project, 'utf-8');
    }

    private createMetainfo(flowDir: string, flowName: string): void {
        const metainfo = [
            `#Store metainfo properties`,
            `#${new Date().toUTCString()}`,
            `description=`,
            ''
        ].join('\n');

        const metainfoPath = path.join(flowDir, 'metainfo.prop');
        fs.writeFileSync(metainfoPath, metainfo, 'utf-8');
    }

    private createParameters(flowDir: string): void {
        const resourcesDir = path.join(flowDir, 'src', 'main', 'resources');

        // parameters.prop - Traditional Java properties format with timestamp
        const paramProp = [
            `#${new Date().toUTCString()}`,
            ''
        ].join('\n');
        fs.writeFileSync(path.join(resourcesDir, 'parameters.prop'), paramProp, 'utf-8');

        // parameters.propdef - XML structure as per SAP format
        // Evidence: SAP reference IPRO_PRODUCT_HTTP/src/main/resources/parameters.propdef
        const paramPropdef = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><parameters><param_references/></parameters>';
        fs.writeFileSync(path.join(resourcesDir, 'parameters.propdef'), paramPropdef, 'utf-8');
    }

    /**
     * Packages resources into the appropriate directories
     *
     * Resources are organized by type:
     * - groovy → src/main/resources/script/
     * - mapping → src/main/resources/mapping/
     * - xsd → src/main/resources/xsd/
     * - xslt → src/main/resources/mapping/ (same as .mmap files)
     *
     * @param flowDir - Base flow directory
     * @param resources - Array of resources to package
     */
    private packageResources(flowDir: string, resources: Resource[]): void {
        const resourcesBaseDir = path.join(flowDir, 'src', 'main', 'resources');

        resources.forEach(resource => {
            // Determine target directory based on resource type
            let targetDir: string;

            switch (resource.type) {
                case 'groovy':
                    targetDir = path.join(resourcesBaseDir, 'script');
                    break;
                case 'mapping':
                    targetDir = path.join(resourcesBaseDir, 'mapping');
                    break;
                case 'xsd':
                    targetDir = path.join(resourcesBaseDir, 'xsd');
                    break;
                case 'xslt':
                    // XSLT files are stored in mapping/ directory (same as .mmap files)
                    // Evidence: POC2 src/main/resources/mapping/XSLTMapping1.xsl
                    targetDir = path.join(resourcesBaseDir, 'mapping');
                    break;
                default:
                    throw new Error(`Unsupported resource type: ${resource.type}`);
            }

            // Create target directory
            fs.mkdirSync(targetDir, { recursive: true });

            // Get resource content (use getContent() method which handles auto-enhancement)
            const content = (resource as any).getContent();

            // Write resource to target directory
            const targetPath = path.join(targetDir, resource.name);
            fs.writeFileSync(targetPath, content, 'utf-8');

            console.log(`✅ Packaged resource: ${resource.type}/${resource.name}`);
        });
    }

    private createZip(sourceDir: string, outputZip: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputZip);
            const archive = new ZipArchive({ zlib: { level: 9 } });

            output.on('close', () => resolve());
            archive.on('error', (err: Error) => reject(err));

            archive.pipe(output);
            archive.directory(sourceDir, false);
            archive.finalize();
        });
    }
}
