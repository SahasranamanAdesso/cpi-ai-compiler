# Router Capability Enhancement Summary

## Problem
RT-003 validation error: "Router has 2 routes but 1 connection"

The AI was generating Router JSON with route configuration but missing the corresponding connections.

## Root Cause
Router requires TWO separate pieces of configuration:
1. **Routes** - Stored in the Router component itself (via `routes` and `defaultRoute` config)
2. **Connections** - Stored in the IFlow's connections array

The validation RT-003 checks: `connections.length === routes.length`

For each route (including defaultRoute), there MUST be a corresponding connection from the router's ID to the route's target component ID.

## Solution

### 1. Enhanced Capabilities API
**File:** `packages/compiler/src/api/capabilities.ts`

Added `notes` field to `ComponentCapability` interface to provide detailed validation requirements.

### 2. Router-Specific Documentation
Updated Router capability metadata:

```typescript
'Router': {
    required: [],
    optional: {
        'name': 'Display name for the component',
        'routes': 'Array of routing conditions and targets - each route must have {condition, target}',
        'defaultRoute': 'Default route when no condition matches - must have {target}'
    },
    example: {
        name: 'Route by Type',
        routes: [
            { condition: "${header.type} == 'A'", target: 'componentA' },
            { condition: "${header.type} == 'B'", target: 'componentB' }
        ],
        defaultRoute: { target: 'defaultComponent' }
    },
    notes: 'CRITICAL: Router requires BOTH routes configuration AND corresponding connections. For each route (including defaultRoute), you MUST add a connection from the router ID to the route target. Validation error RT-003 occurs when the number of connections does not match the number of routes. Minimum 2 routes required (at least 1 conditional route + 1 default route).'
}
```

## Correct Router JSON Format

```json
{
    "name": "OrderRoutingFlow",
    "sender": {
        "type": "HTTPS",
        "config": { "address": "/api/orders" }
    },
    "receiver": {
        "type": "HTTPS",
        "config": { "url": "https://backend.example.com" }
    },
    "components": [
        {
            "id": "router1",
            "type": "Router",
            "config": {
                "name": "Route by Type",
                "routes": [
                    { "condition": "${header.type} == 'A'", "target": "handlerA" }
                ],
                "defaultRoute": { "target": "handlerB" }
            }
        },
        {
            "id": "handlerA",
            "type": "ContentModifier",
            "config": { "name": "Handler A" }
        },
        {
            "id": "handlerB",
            "type": "ContentModifier",
            "config": { "name": "Handler B" }
        }
    ],
    "connections": [
        { "from": "router1", "to": "handlerA" },
        { "from": "router1", "to": "handlerB" }
    ]
}
```

## Key Points

1. **Routes Configuration**: Defines the routing logic with conditions and targets
   - `routes`: Array of conditional routes, each with `condition` and `target`
   - `defaultRoute`: Fallback route with `target` (no condition)

2. **Connections Array**: Defines the actual BPMN connections
   - For each route, add: `{ from: routerId, to: routeTarget }`
   - Number of connections MUST equal number of routes (including defaultRoute)

3. **Validation**: RT-003 ensures routes match connections
   - ✅ 2 routes + 2 connections → PASS
   - ❌ 2 routes + 1 connection → RT-003 error

4. **Minimum Routes**: Router requires at least 2 routes total
   - Minimum: 1 conditional route + 1 default route
   - Can have multiple conditional routes + 1 default route

## Tests Added

### test-router-validation.ts
Direct API tests using IFlow and Router classes:
- ✅ Router with 2 routes + 2 connections → validates
- ✅ Router with 2 routes + 1 connection → RT-003 error

### test-router-fromjson.ts
Complete AI JSON workflow tests:
- ✅ Valid Router JSON (2 routes + 2 connections) → validates
- ✅ Invalid Router JSON (2 routes + 1 connection) → RT-003 error
- ✅ Valid Router JSON (3 routes + 3 connections) → validates
- ✅ Valid Router compiles to ZIP successfully

### test-router-capabilities.ts
Capabilities API verification:
- ✅ Router capability includes notes field
- ✅ Notes mention connections requirement
- ✅ Notes mention RT-003 validation
- ✅ Example shows correct structure with targets

## Build & Test Results

```
✅ npm run build - SUCCESS (no TypeScript errors)
✅ test-router-validation.ts - ALL PASS
✅ test-router-fromjson.ts - ALL PASS  
✅ test-router-capabilities.ts - ALL PASS
✅ test-capabilities.ts - ALL PASS (11 components, 12 adapters)
```

## Commit
**Hash:** 097d4cd
**Branch:** main
**Status:** Pushed to origin

## Impact on AI/CAP Layer

The AI can now call `getCapabilities()` and receive:
- Clear documentation that Router needs BOTH routes AND connections
- Example showing correct JSON structure
- Explicit mention of RT-003 validation requirement
- Understanding that each route.target needs a corresponding connection

This allows the AI to generate valid Router JSON without trial-and-error.
