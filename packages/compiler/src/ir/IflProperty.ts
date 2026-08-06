/**
 * IflProperty - SAP Integration Flow Extension Property
 *
 * Represents <ifl:property> elements used throughout SAP BPMN
 * These properties carry SAP-specific metadata
 */
export class IflProperty {
    constructor(
        public readonly key: string,
        public readonly value: string
    ) {}
}
