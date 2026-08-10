/**
 * CPI AI Compiler - Core Compiler Package
 *
 * AI-powered npm package for compiling SAP Cloud Integration (CPI) Integration Flows.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { compileToZip, IFlow, HttpAdapter } from '@cpi-ai/compiler';
 *
 * const flow = new IFlow("MyFlow");
 * flow.setSender(HttpAdapter.sender({ address: "/api/orders" }));
 * flow.setReceiver(HttpAdapter.receiver({ url: "https://example.com" }));
 *
 * const zipBuffer = await compileToZip(flow);
 * fs.writeFileSync("MyFlow.zip", zipBuffer);
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// PRIMARY PUBLIC API - Compiler Functions (4 core functions)
// ============================================================================

/**
 * Primary compiler functions - use these for most use cases
 */
export { compile, compileToZip } from './api/compile';
export { validate } from './api/validate';
export { supportedComponents } from './api/components';

// Export validation types
export type { ValidationResult, ValidationError, ValidationSeverity } from './api/validate';

// ============================================================================
// EXTENDED API - Model Layer (for building flows)
// ============================================================================

/**
 * Core model classes for building Integration Flows
 */
export { IFlow } from './model/IFlow';
export { Component } from './model/Component';
export { Connection } from './model/Connection';
export { Resource } from './model/Resource';
export { Router, Route } from './model/Router';
export { GroovyScript } from './model/GroovyScript';
export { GroovyResource } from './model/GroovyResource';
export { DataStore } from './model/DataStore';
export { Multicast } from './model/Multicast';
export { Splitter } from './model/Splitter';
export { Gather } from './model/Gather';
export { MessageMapping } from './model/MessageMapping';
export { MappingResource } from './model/MappingResource';
export { XsdResource } from './model/XsdResource';
export { XmlValidator } from './model/XmlValidator';
export { XsltMapping } from './model/XsltMapping';
export { XsltResource } from './model/XsltResource';
export { ProcessCall } from './model/ProcessCall';
export { LocalIntegrationProcess } from './model/LocalIntegrationProcess';
export { ExceptionSubprocess } from './model/ExceptionSubprocess';
export { HttpAdapter } from './model/HttpAdapter';
export { ODataAdapter } from './model/ODataAdapter';
export { SftpAdapter } from './model/SftpAdapter';
export { SoapAdapter } from './model/SoapAdapter';
export { IdocAdapter } from './model/IdocAdapter';

// ============================================================================
// PUBLIC API - Mapper Layer
// ============================================================================

/**
 * Mapper that transforms IFlow model to BPMN IR
 */
export { BpmnProcessMapper } from './mapper/BpmnProcessMapper';
export { ComponentMapper } from './mapper/ComponentMapper';

// ============================================================================
// PUBLIC API - IR Layer
// ============================================================================

/**
 * BPMN Intermediate Representation classes
 */
export { BpmnDefinitions } from './ir/BpmnDefinitions';
export { BpmnCollaboration } from './ir/BpmnCollaboration';
export { BpmnProcess } from './ir/BpmnProcess';
export { BpmnNode } from './ir/BpmnNode';
export { BpmnParticipant } from './ir/BpmnParticipant';
export { BpmnMessageFlow } from './ir/BpmnMessageFlow';
export { BpmnSequenceFlow } from './ir/BpmnSequenceFlow';
export { BpmnSubProcess } from './ir/BpmnSubProcess';
export { BpmnDiagram } from './ir/BpmnDiagram';
export { BpmnShape } from './ir/BpmnShape';
export { BpmnEdge } from './ir/BpmnEdge';
export { IflProperty } from './ir/IflProperty';

// ============================================================================
// PUBLIC API - Serialization Layer
// ============================================================================

/**
 * Serializers and packagers for generating .iflw artifacts
 */
export { IflowSerializer } from './serializer/IflowSerializer';
export { IflowPackager } from './packager/IflowPackager';

// ============================================================================
// PUBLIC API - Registry Layer
// ============================================================================

/**
 * Component registry for SAP CPI component metadata
 */
export { Registry } from './registry/Registry';
export { ComponentRegistry } from './registry/ComponentRegistry';

// ============================================================================
// PUBLIC API - Factory Layer (new in Step 11)
// ============================================================================

/**
 * Generic factory functions for creating components from AI JSON
 */
export { createComponent, createAdapter, fromJson } from './factory/ComponentFactory';
export type {
    ComponentType,
    AdapterType,
    AdapterDirection,
    ComponentConfig,
    AdapterConfig,
    ResourceConfig,
    ConnectionConfig,
    IFlowJson
} from './factory/ComponentFactory';
