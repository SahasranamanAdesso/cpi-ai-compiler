/**
 * SAP Integration SDK - TypeScript SDK for SAP Cloud Integration
 *
 * This SDK allows you to programmatically generate SAP Cloud Integration (CPI)
 * Integration Flows using TypeScript instead of manual graphical configuration.
 *
 * @packageDocumentation
 */

// ============================================================================
// PUBLIC API - Model Layer
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
