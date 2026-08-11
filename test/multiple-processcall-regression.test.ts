/**
 * Regression Test: Multiple ProcessCall Instances
 *
 * Verifies that multiple instances of the same component type can be created
 * without ID collisions, even when created in the same millisecond.
 *
 * Root Cause: ProcessCall constructor used Date.now() without accepting an
 * optional id parameter from the factory.
 *
 * Fix: Added optional id parameter to ProcessCall constructor (same pattern
 * as Router and GroovyScript) and pass it from ComponentFactory.
 */

import { fromJson } from '../packages/compiler/src/factory/ComponentFactory';
import { validate } from '../packages/compiler/src/api/validate';

describe('Multiple ProcessCall Instances', () => {
    test('should create two ProcessCall instances with unique IDs', () => {
        const json = {
            name: 'MultiProcessTest',
            sender: {
                type: 'HTTPS',
                config: { address: '/test' }
            },
            receiver: {
                type: 'HTTP',
                config: { url: 'https://example.com', method: 'POST' }
            },
            components: [
                {
                    id: 'domesticService',
                    type: 'ProcessCall',
                    config: {
                        name: 'Domestic Processing Service',
                        processId: 'domestic_sub_process'
                    }
                },
                {
                    id: 'internationalService',
                    type: 'ProcessCall',
                    config: {
                        name: 'International Processing Service',
                        processId: 'international_sub_process'
                    }
                }
            ]
        };

        // This should not throw CP-001 Duplicate component ID error
        const flow = fromJson(json);

        expect(flow.getComponents()).toHaveLength(2);

        const components = flow.getComponents();
        const ids = components.map(c => c.id);

        // IDs must be unique
        expect(new Set(ids).size).toBe(2);

        // IDs should be the JSON-provided IDs
        expect(ids).toContain('domesticService');
        expect(ids).toContain('internationalService');
    });

    test('should validate flow with multiple ProcessCall instances', () => {
        const json = {
            name: 'MultiProcessTest',
            sender: {
                type: 'HTTPS',
                config: { address: '/test' }
            },
            receiver: {
                type: 'HTTP',
                config: { url: 'https://example.com', method: 'POST' }
            },
            components: [
                {
                    id: 'domesticService',
                    type: 'ProcessCall',
                    config: {
                        name: 'Domestic Processing Service',
                        processId: 'domestic_sub_process'
                    }
                },
                {
                    id: 'internationalService',
                    type: 'ProcessCall',
                    config: {
                        name: 'International Processing Service',
                        processId: 'international_sub_process'
                    }
                }
            ]
        };

        const flow = fromJson(json);
        const result = validate(flow);

        // Should not have CP-001 duplicate ID error
        const duplicateIdErrors = result.errors.filter(e => e.code === 'CP-001');
        expect(duplicateIdErrors).toHaveLength(0);
    });

    test('should handle multiple instances of ANY component type', () => {
        const json = {
            name: 'MultiComponentTest',
            sender: {
                type: 'HTTPS',
                config: { address: '/test' }
            },
            receiver: {
                type: 'HTTP',
                config: { url: 'https://example.com', method: 'POST' }
            },
            components: [
                {
                    id: 'router1',
                    type: 'Router',
                    config: {
                        name: 'Router 1',
                        routes: [{ condition: '${x}', target: 'groovy1' }],
                        defaultRoute: { target: 'groovy2' }
                    }
                },
                {
                    id: 'router2',
                    type: 'Router',
                    config: {
                        name: 'Router 2',
                        routes: [{ condition: '${y}', target: 'groovy3' }],
                        defaultRoute: { target: 'groovy4' }
                    }
                },
                {
                    id: 'groovy1',
                    type: 'GroovyScript',
                    config: { name: 'Script 1', scriptName: 'script1.groovy' }
                },
                {
                    id: 'groovy2',
                    type: 'GroovyScript',
                    config: { name: 'Script 2', scriptName: 'script2.groovy' }
                },
                {
                    id: 'groovy3',
                    type: 'GroovyScript',
                    config: { name: 'Script 3', scriptName: 'script3.groovy' }
                },
                {
                    id: 'groovy4',
                    type: 'GroovyScript',
                    config: { name: 'Script 4', scriptName: 'script4.groovy' }
                },
                {
                    id: 'process1',
                    type: 'ProcessCall',
                    config: { name: 'Process 1', processId: 'subprocess1' }
                },
                {
                    id: 'process2',
                    type: 'ProcessCall',
                    config: { name: 'Process 2', processId: 'subprocess2' }
                }
            ]
        };

        const flow = fromJson(json);

        expect(flow.getComponents()).toHaveLength(8);

        const components = flow.getComponents();
        const ids = components.map(c => c.id);

        // All IDs must be unique
        expect(new Set(ids).size).toBe(8);

        // Validation should pass
        const result = validate(flow);
        const duplicateIdErrors = result.errors.filter(e => e.code === 'CP-001');
        expect(duplicateIdErrors).toHaveLength(0);
    });

    test('should preserve AI-provided logical component IDs', () => {
        const json = {
            name: 'Test',
            sender: {
                type: 'HTTPS',
                config: { address: '/test' }
            },
            receiver: {
                type: 'HTTP',
                config: { url: 'https://example.com', method: 'POST' }
            },
            components: [
                {
                    id: 'myCustomId1',
                    type: 'ProcessCall',
                    config: { name: 'Process 1', processId: 'subprocess1' }
                },
                {
                    id: 'myCustomId2',
                    type: 'ProcessCall',
                    config: { name: 'Process 2', processId: 'subprocess2' }
                }
            ]
        };

        const flow = fromJson(json);
        const components = flow.getComponents();

        // JSON-provided IDs should be preserved
        expect(components[0].id).toBe('myCustomId1');
        expect(components[1].id).toBe('myCustomId2');
    });
});
