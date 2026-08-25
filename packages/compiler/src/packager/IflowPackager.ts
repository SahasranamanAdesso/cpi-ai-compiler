import * as fs from 'fs';
import * as path from 'path';
import { ZipArchive } from 'archiver';
import { Resource } from '../model/Resource';
import { ExternalizedParameter } from '../utils/ExternalizedParameters';

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
     * @param externalizedParameters - Optional list of "{{...}}"-placeholder
     *        properties (from adapter types with real propdef evidence --
     *        see ExternalizedParameters.ts) that must be registered in
     *        parameters.prop/parameters.propdef for SAP to treat them as
     *        actual externalized parameters rather than literal, invalid
     *        values.
     */
    async package(
        flowDir: string,
        flowName: string,
        outputZip: string,
        resources?: Resource[],
        externalizedParameters?: ExternalizedParameter[]
    ): Promise<void> {

        // Create MANIFEST.MF
        this.createManifest(flowDir, flowName);

        // Create .project
        this.createProject(flowDir, flowName);

        // Create metainfo.prop
        this.createMetainfo(flowDir, flowName);

        // Create parameters.prop and parameters.propdef
        this.createParameters(flowDir, externalizedParameters);

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
        ].join('\r\n');

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
        ].join('\r\n');

        const projectPath = path.join(flowDir, '.project');
        fs.writeFileSync(projectPath, project, 'utf-8');
    }

    private createMetainfo(flowDir: string, flowName: string): void {
        const metainfo = [
            `#Store metainfo properties`,
            `#${new Date().toUTCString()}`,
            `description=`,
            ''
        ].join('\r\n');

        const metainfoPath = path.join(flowDir, 'metainfo.prop');
        fs.writeFileSync(metainfoPath, metainfo, 'utf-8');
    }

    /**
     * Writes parameters.prop and parameters.propdef.
     *
     * When no externalized parameters are needed (the common case -- every
     * adapter type except AMQP, and AMQP flows that use literal values
     * instead of "{{...}}" placeholders), this produces byte-identical
     * output to before this method gained parameter support: a bare
     * timestamped parameters.prop and a "<param_references/>" propdef.
     * Evidence: SAP reference IPRO_PRODUCT_HTTP/src/main/resources/parameters.propdef.
     *
     * When one or more "{{...}}"-placeholder properties ARE present (see
     * ExternalizedParameters.ts), each gets a real <parameter> definition
     * plus a <reference> linking the specific adapter attribute to it, and
     * a KEY=<defaultValue> line in parameters.prop -- reproducing the
     * three-piece structure amqp_reference.zip's own parameters.prop/
     * parameters.propdef use for its externalized EMHOST/EMPORT/EMUser/etc.
     * parameters. The default value is never a real company's
     * infrastructure/credential, but it is also never left empty --
     * confirmed by live SAP Integration Suite import that an externalized
     * field resolving to an empty string still fails "Attribute is
     * mandatory"/format validation exactly like a literal empty value would
     * (externalizing a field only makes its value swappable later via
     * SAP's Configure > Externalized Parameters screen, it does not exempt
     * the field from needing one). See ExternalizedParameters.ts's
     * AMQP_PLACEHOLDER_DEFAULTS for the exact clearly-fake value used per
     * property.
     */
    private createParameters(flowDir: string, externalizedParameters: ExternalizedParameter[] = []): void {
        const resourcesDir = path.join(flowDir, 'src', 'main', 'resources');

        // Dedupe by paramKey: the same placeholder name reused across
        // multiple properties (unusual, but not prevented) must still only
        // produce one <parameter> definition and one parameters.prop line --
        // SAP's own parameters.prop is keyed by parameter name, not by
        // adapter attribute.
        const uniqueParams = new Map<string, ExternalizedParameter>();
        externalizedParameters.forEach(p => {
            if (!uniqueParams.has(p.paramKey)) {
                uniqueParams.set(p.paramKey, p);
            }
        });

        // parameters.prop - Traditional Java properties format with timestamp
        const paramPropLines = [`#${new Date().toUTCString()}`];
        uniqueParams.forEach(p => paramPropLines.push(`${p.paramKey}=${p.defaultValue}`));
        fs.writeFileSync(path.join(resourcesDir, 'parameters.prop'), paramPropLines.join('\r\n') + '\r\n', 'utf-8');

        // parameters.propdef - XML structure as per SAP format
        let paramPropdef: string;
        if (uniqueParams.size === 0) {
            paramPropdef = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><parameters><param_references/></parameters>';
        } else {
            const parameterElements = Array.from(uniqueParams.values()).map(p =>
                `<parameter><key/><name>${this.escapeXml(p.paramKey)}</name><type>xsd:${p.xsdType}</type><isRequired>false</isRequired><constraint/><description/><additionalMetadata/></parameter>`
            ).join('');

            const referenceElements = externalizedParameters.map(p =>
                `<reference attribute_category="${this.escapeXml(p.attributeCategory)}" attribute_id="${this.escapeXml(p.attributeId)}" attribute_uilabel="" param_key="${this.escapeXml(p.paramKey)}"/>`
            ).join('');

            paramPropdef = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><parameters>${parameterElements}<param_references>${referenceElements}</param_references></parameters>`;
        }
        fs.writeFileSync(path.join(resourcesDir, 'parameters.propdef'), paramPropdef, 'utf-8');
    }

    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
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
