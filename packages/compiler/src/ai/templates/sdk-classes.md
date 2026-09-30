# Supported SDK Classes (Version 1.0)

## IFlow - Main Integration Flow container

**Constructor:** `new IFlow(name: string)`

**Methods:**
- `addComponent(component: Component): IFlow`
- `connect(from: Component, to: Component): IFlow`
- `getComponents(): Component[]`
- `getConnections(): Connection[]`

**Example:**
```
const flow = new IFlow("MyFlow");
```

## Component - Generic CPI component

**Constructor:** `new Component(id: string, name: string, componentType: string)`

**Properties:**
- `id: string` - Unique identifier (e.g., "CallActivity_1")
- `name: string` - Display name (e.g., "Set Body")
- `componentType: string` - Technical type (see supported types below)
- `properties: Record<string, any>` - Component-specific properties

**Example:**
```
const component = new Component("CallActivity_1", "Set Body", "Enricher");
component.properties.bodyType = "constant";
component.properties.body = "Hello World";
```

## Automatically Added by Compiler

The compiler automatically adds these - DO NOT create them:
- HTTPS Sender (added automatically)
- HTTP Receiver (added automatically)
- Start Event (added automatically)
- End Event (added automatically)

You only need to add processing components (Content Modifier, etc.).
