# Compiler Validation Rules

**Version**: 1.0  
**Purpose**: Complete list of validation rules enforced by the compiler

---

## Flow-Level Rules

### FL-001: Exactly One IFlow
- **Rule**: Every compilation must have exactly one IFlow container
- **Violation**: Creating zero or multiple IFlow instances
- **Example**:
  ```typescript
  ❌ // No IFlow
  const component = new Component(...)
  
  ✅ const flow = new IFlow("OrderProcessing")
  ```

### FL-002: Flow Must Have Name
- **Rule**: IFlow name is required and must be 1-200 characters
- **Violation**: Empty name or name > 200 chars
- **Example**:
  ```typescript
  ❌ new IFlow("")
  ✅ new IFlow("Order Processing Flow")
  ```

### FL-003: Exactly One Sender
- **Rule**: Flow must have exactly one sender adapter
- **Violation**: Zero senders or multiple senders
- **Example**:
  ```typescript
  ❌ // No sender
  flow.setReceiver(receiver)
  
  ❌ // Multiple senders
  flow.setSender(httpSender)
  flow.setSender(sftpSender)
  
  ✅ flow.setSender(httpSender)
  ```

### FL-004: At Least One Receiver
- **Rule**: Flow must have at least one receiver adapter
- **Violation**: No receiver set
- **Example**:
  ```typescript
  ❌ flow.setSender(sender)  // Missing receiver
  ✅ flow.setSender(sender)
     flow.setReceiver(receiver)
  ```

### FL-005: All Components Must Be Added
- **Rule**: Every component must be added via `flow.addComponent()`
- **Violation**: Creating component but not adding to flow
- **Example**:
  ```typescript
  ❌ const cm = new Component(...)
     flow.connect(cm, ...)  // Component not added
  
  ✅ const cm = new Component(...)
     flow.addComponent(cm)
     flow.connect(cm, ...)
  ```

---

## Component-Level Rules

### CP-001: Unique Component IDs
- **Rule**: Every component ID must be unique within the flow
- **Violation**: Duplicate IDs
- **Example**:
  ```typescript
  ❌ new Component("CMP_1", "A", "Enricher", {})
     new Component("CMP_1", "B", "Enricher", {})  // Duplicate ID
  
  ✅ new Component("CMP_1", "A", "Enricher", {})
     new Component("CMP_2", "B", "Enricher", {})
  ```

### CP-002: Valid Component Type
- **Rule**: Component type must exist in ComponentRegistry
- **Violation**: Using unregistered component type
- **Example**:
  ```typescript
  ❌ new Component("id", "name", "CustomTransformer", {})
  ✅ new Component("id", "name", "Enricher", {})
  ```

### CP-003: Component Name Required
- **Rule**: Component name must be non-empty
- **Violation**: Empty or null name
- **Example**:
  ```typescript
  ❌ new Component("id", "", "Enricher", {})
  ✅ new Component("id", "Set Body", "Enricher", {})
  ```

### CP-004: Valid Component Properties
- **Rule**: Properties must match component type's schema
- **Violation**: Invalid property for component type
- **Example**:
  ```typescript
  // Content Modifier requires at least one of: body, headerTable, propertyTable
  ❌ new Component("id", "Modifier", "Enricher", {})
  ✅ new Component("id", "Modifier", "Enricher", {body: "Hello"})
  ```

---

## Connection Rules

### CN-001: Add Components Before Connecting
- **Rule**: Both components in connection must be added to flow first
- **Violation**: Connecting components not yet added
- **Example**:
  ```typescript
  ❌ flow.connect(a, b)  // a and b not added yet
  
  ✅ flow.addComponent(a)
     flow.addComponent(b)
     flow.connect(a, b)
  ```

### CN-002: No Self-Connections
- **Rule**: Component cannot connect to itself
- **Violation**: `flow.connect(a, a)`
- **Example**:
  ```typescript
  ❌ flow.connect(component, component)
  ✅ flow.connect(componentA, componentB)
  ```

### CN-003: All Components Must Be Reachable
- **Rule**: Every component must have path from Start event
- **Violation**: Orphaned components with no incoming connections
- **Example**:
  ```typescript
  ❌ flow.addComponent(a)
     flow.addComponent(b)
     flow.connect(a, c)  // b is orphaned
  
  ✅ flow.connect(a, b)
     flow.connect(b, c)
  ```

### CN-004: All Components Must Be Terminal
- **Rule**: Every component must have path to End event
- **Violation**: Dead-end components with no outgoing connections
- **Example**:
  ```typescript
  ❌ flow.connect(a, b)  // b has no outgoing connection
  
  ✅ flow.connect(a, b)
     flow.connect(b, c)
  ```

---

## Router-Specific Rules

### RT-001: Router Must Have Routes Defined
- **Rule**: Router must call `.when()` or `.otherwise()` at least once
- **Violation**: Router with no routes
- **Example**:
  ```typescript
  ❌ const router = new Router("Route")  // No routes defined
  
  ✅ const router = new Router("Route")
                   .when("${header.Type} = 'A'")
                   .otherwise()
  ```

### RT-002: Router Must Have At Least Two Routes
- **Rule**: Router must have minimum 2 routes (1 conditional + 1 default)
- **Violation**: Only one route (default only)
- **Example**:
  ```typescript
  ❌ router.otherwise()  // Only default route
  
  ✅ router.when("${header.Type} = 'A'")
          .otherwise()
  ```

### RT-003: Router Connections Must Match Routes
- **Rule**: Number of `connect(router, X)` calls must equal number of routes
- **Violation**: Route count ≠ connection count
- **Example**:
  ```typescript
  // Router has 2 routes
  router.when("${header.Type} = 'A'")
        .otherwise()
  
  ❌ flow.connect(router, a)  // Only 1 connection
  
  ✅ flow.connect(router, a)
     flow.connect(router, b)  // 2 connections
  ```

### RT-004: Only One Default Route
- **Rule**: Router can have maximum one `.otherwise()` call
- **Violation**: Multiple `.otherwise()` calls
- **Example**:
  ```typescript
  ❌ router.when("...").otherwise().otherwise()
  ✅ router.when("...").otherwise()
  ```

### RT-005: Valid Route Conditions
- **Rule**: Route conditions must use SAP Simple Expression syntax
- **Violation**: Invalid expression format
- **Example**:
  ```typescript
  ❌ router.when("header.Country == 'IN'")  // Missing ${}, wrong ==
  ❌ router.when("${header.Country} == 'IN'")  // Wrong ==
  ✅ router.when("${header.Country} = 'IN'")  // Correct
  ```

---

## Resource Rules

### RS-001: Resource Must Have Name
- **Rule**: Resource name is required
- **Violation**: Empty resource name
- **Example**:
  ```typescript
  ❌ new GroovyResource("", content)
  ✅ new GroovyResource("transform.groovy", content)
  ```

### RS-002: Resource Must Have Content or Path
- **Rule**: Resource must provide either inline content or file path
- **Violation**: Both empty
- **Example**:
  ```typescript
  ❌ new GroovyResource("script.groovy")  // No content
  ✅ new GroovyResource("script.groovy", scriptContent)
  ```

### RS-003: Referenced Resources Must Exist
- **Rule**: If component references resource, resource must be added to flow
- **Violation**: Component references missing resource
- **Example**:
  ```typescript
  ❌ new GroovyScript("Transform", "script.groovy")
     // No GroovyResource added
  
  ✅ new GroovyScript("Transform", "script.groovy")
     flow.addResource(new GroovyResource("script.groovy", "..."))
  ```

### RS-004: Resource Names Must Match Component References
- **Rule**: Resource file name must match component's reference
- **Violation**: Name mismatch
- **Example**:
  ```typescript
  ❌ new GroovyScript("...", "transform.groovy")
     flow.addResource(new GroovyResource("process.groovy", "..."))
  
  ✅ new GroovyScript("...", "transform.groovy")
     flow.addResource(new GroovyResource("transform.groovy", "..."))
  ```

### RS-005: No Orphaned Resources
- **Rule**: Every resource must be referenced by at least one component
- **Violation**: Resource added but never used
- **Example**:
  ```typescript
  ❌ flow.addResource(new GroovyResource("unused.groovy", "..."))
     // No GroovyScript references it
  
  ✅ const script = new GroovyScript("...", "transform.groovy")
     flow.addResource(new GroovyResource("transform.groovy", "..."))
  ```

---

## Adapter-Specific Rules

### AD-001: Adapter Names Must Be Valid XML NCName
- **Rule**: Adapter names cannot contain spaces or special characters
- **Violation**: Spaces in adapter name
- **Example**:
  ```typescript
  ❌ HttpAdapter.sender({name: "HTTP Sender", ...})  // Space
  ✅ HttpAdapter.sender({name: "HTTPSender", ...})   // No space
  ```

### AD-002: SFTP Sender Requires File Pattern
- **Rule**: SFTP sender must specify filePattern
- **Violation**: Missing filePattern
- **Example**:
  ```typescript
  ❌ SftpAdapter.sender({host: "...", directory: "..."})
  ✅ SftpAdapter.sender({
        host: "...", 
        directory: "...",
        filePattern: "*.csv"
     })
  ```

### AD-003: SFTP Receiver Requires File Name
- **Rule**: SFTP receiver must specify fileName
- **Violation**: Missing fileName
- **Example**:
  ```typescript
  ❌ SftpAdapter.receiver({host: "...", directory: "..."})
  ✅ SftpAdapter.receiver({
        host: "...",
        directory: "...",
        fileName: "output.xml"
     })
  ```

### AD-004: OData Must Have Resource Path
- **Rule**: OData adapter must specify resourcePath
- **Violation**: Missing resourcePath
- **Example**:
  ```typescript
  ❌ ODataAdapter.receiver({name: "OData", operation: "Create"})
  ✅ ODataAdapter.receiver({
        name: "OData",
        resourcePath: "Orders",
        operation: "Create"
     })
  ```

### AD-005: OData Must Have Valid Operation
- **Rule**: OData operation must be Create/Read/Update/Delete/Query
- **Violation**: Invalid operation
- **Example**:
  ```typescript
  ❌ ODataAdapter.receiver({..., operation: "Insert"})
  ✅ ODataAdapter.receiver({..., operation: "Create"})
  ```

---

## Content Modifier Rules

### CM-001: Must Set At Least One Property
- **Rule**: Content Modifier must set body, header, or property
- **Violation**: Empty properties
- **Example**:
  ```typescript
  ❌ new Component("id", "Modifier", "Enricher", {})
  ✅ new Component("id", "Modifier", "Enricher", {body: "Hello"})
  ```

### CM-002: Header Table Format
- **Rule**: headerTable must use named cell IDs (Action, Type, Value, Name, etc.)
- **Violation**: Numeric cell IDs
- **Example**:
  ```typescript
  ❌ headerTable: "<row><cell id='0'>Create</cell>..."
  ✅ headerTable: "<row><cell id='Action'>Create</cell>
                        <cell id='Type'>constant</cell>
                        <cell id='Value'>IN</cell>
                        <cell id='Name'>Country</cell></row>"
  ```

### CM-003: Valid Action Type
- **Rule**: Header/Property action must be Create/Delete/Modify
- **Violation**: Invalid action
- **Example**:
  ```typescript
  ❌ <cell id='Action'>Add</cell>
  ✅ <cell id='Action'>Create</cell>
  ```

---

## Metadata Rules

### MD-001: Component Metadata From Registry
- **Rule**: Component metadata must come from ComponentRegistry
- **Violation**: Manually setting activityType, cmdVariantUri
- **Example**:
  ```typescript
  ❌ new Component("id", "name", "Enricher", {
        activityType: "Enricher",
        cmdVariantUri: "..."
     })
  
  ✅ new Component("id", "name", "Enricher", {
        body: "Hello"  // Only user properties
     })
  ```

### MD-002: No Direct BPMN Generation
- **Rule**: Never generate BPMN XML directly
- **Violation**: Creating XML strings
- **Example**:
  ```typescript
  ❌ const xml = "<bpmn2:callActivity>...</bpmn2:callActivity>"
  ✅ new Component("id", "name", "Enricher", {body: "..."})
  ```

---

## Expression Rules

### EX-001: Simple Expressions Use Single Equals
- **Rule**: Comparisons must use `=` not `==`
- **Violation**: JavaScript-style `==` or `===`
- **Example**:
  ```typescript
  ❌ "${header.Country} == 'IN'"
  ✅ "${header.Country} = 'IN'"
  ```

### EX-002: String Literals Use Single Quotes
- **Rule**: String values must use single quotes
- **Violation**: Double quotes
- **Example**:
  ```typescript
  ❌ "${header.Country} = \"IN\""
  ✅ "${header.Country} = 'IN'"
  ```

### EX-003: Variables Must Use ${} Wrapper
- **Rule**: Variable access requires `${...}` syntax
- **Violation**: Bare variable names
- **Example**:
  ```typescript
  ❌ "header.Country = 'IN'"
  ✅ "${header.Country} = 'IN'"
  ```

---

## Validation Checklist

Before compilation, verify:

- [ ] Exactly 1 IFlow
- [ ] Exactly 1 Sender
- [ ] At least 1 Receiver
- [ ] All component IDs unique
- [ ] All component types in Registry
- [ ] All components added before connection
- [ ] Router has ≥2 routes with matching connections
- [ ] All referenced resources exist and match names
- [ ] No orphaned resources
- [ ] No orphaned components
- [ ] Adapter names valid XML NCName
- [ ] Content Modifier cells use named IDs
- [ ] Expressions use single `=` and single quotes
- [ ] No direct BPMN/XML generation
- [ ] No hardcoded metadata
