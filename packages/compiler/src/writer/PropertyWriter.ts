import { IflProperty } from "../ir/IflProperty";

/**
 * PropertyWriter - Writes SAP extension properties <ifl:property>
 *
 * Used throughout BPMN elements to add SAP-specific metadata.
 *
 * Example output:
 *   <ifl:property>
 *       <key>Address</key>
 *       <value>/hello</value>
 *   </ifl:property>
 */
export class PropertyWriter {

    write(property: IflProperty): string {
        return `<ifl:property>\n` +
               `    <key>${this.escape(property.key)}</key>\n` +
               `    <value>${this.escape(property.value)}</value>\n` +
               `</ifl:property>`;
    }

    writeAll(properties: IflProperty[], indent: string = ""): string {
        return properties
            .map(p => indent + this.write(p))
            .join('\n');
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
