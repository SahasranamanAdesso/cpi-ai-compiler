# Component Factory Sprint - Next Steps
## Action Plan for Message Mapping & Data Store Implementation

**Date**: 2026-08-04  
**Status**: Waiting for SAP Reference Exports  
**Blocking**: Message Mapping & Data Store implementation

---

## Current Situation

### ✅ Completed
- **Content Modifier**: Fully implemented, verified, production-ready
- **Router**: Fully implemented, verified, production-ready
- **Groovy Script**: Fully implemented, verified, production-ready

### ⏸️ Blocked (Evidence Required)
- **Message Mapping**: Cannot implement without SAP export
- **Data Store**: Cannot implement without SAP export

---

## Required Actions

### Action 1: Obtain Message Mapping SAP Export

**Time Required**: 30 minutes

**Steps**:

1. **Open SAP Integration Suite**
   - Navigate to Design → Integrations
   - Click "Create"

2. **Create Test Flow with Message Mapping**
   ```
   Flow Name: MessageMappingTest
   
   Components:
   ├─ HTTPS Sender
   ├─ Message Mapping (add this component)
   └─ HTTP Receiver
   ```

3. **Configure Message Mapping**
   - Add a simple mapping (e.g., copy fields)
   - Can be minimal - we just need the BPMN metadata
   - Upload or create a simple .mmap file

4. **Export the Flow**
   - Click on the flow
   - Select "Export"
   - Download `MessageMappingTest.zip`

5. **Extract and Store**
   ```powershell
   # Extract the ZIP
   Expand-Archive MessageMappingTest.zip -DestinationPath MessageMappingTest
   
   # Copy to reference library
   Copy-Item MessageMappingTest -Destination "C:\Sahas\adesso\CPI_AI\sap-integration-sdk\reference\sap-exports\message-mapping-test" -Recurse
   ```

6. **Document**
   - Note SAP version used
   - Note export date
   - Create README.md in the reference folder

---

### Action 2: Obtain Data Store SAP Export

**Time Required**: 30 minutes

**Steps**:

1. **Create Test Flow with Data Store Write**
   ```
   Flow Name: DataStoreWriteTest
   
   Components:
   ├─ HTTPS Sender
   ├─ Data Store Write Operation
   └─ HTTP Receiver
   ```

2. **Configure Data Store Write**
   - Data Store Name: "TestStore"
   - Entry ID: "${header.id}"
   - Can be minimal configuration

3. **Export and Store**
   ```powershell
   Expand-Archive DataStoreWriteTest.zip -DestinationPath DataStoreWriteTest
   Copy-Item DataStoreWriteTest -Destination "C:\Sahas\adesso\CPI_AI\sap-integration-sdk\reference\sap-exports\datastore-write-test" -Recurse
   ```

4. **Create Test Flow with Data Store Get**
   ```
   Flow Name: DataStoreGetTest
   
   Components:
   ├─ HTTPS Sender
   ├─ Data Store Get Operation
   └─ HTTP Receiver
   ```

5. **Export and Store**
   ```powershell
   Expand-Archive DataStoreGetTest.zip -DestinationPath DataStoreGetTest
   Copy-Item DataStoreGetTest -Destination "C:\Sahas\adesso\CPI_AI\sap-integration-sdk\reference\sap-exports\datastore-get-test" -Recurse
   ```

6. **Optional: Data Store Delete**
   - If Delete is a separate operation type, repeat for Delete
   - Otherwise, Get/Write operations may include delete metadata

---

## After Obtaining Exports

### Step 1: Extract Metadata (30 min per component)

#### For Message Mapping:

```powershell
cd C:\Sahas\adesso\CPI_AI\sap-integration-sdk

# Find the Message Mapping component
Get-Content "reference\sap-exports\message-mapping-test\src\main\resources\scenarioflows\integrationflow\MessageMappingTest.iflw" | Select-String -Pattern "activityType|MessageMapping|MessageTransform" -Context 0,20
```

**Document**:
- `activityType` value
- `cmdVariantUri` value
- `componentVersion` value
- All property keys (look for `<ifl:property>` sections)
- Resource structure (look for .mmap files in resources/)

#### For Data Store:

```powershell
# Find Data Store operations
Get-Content "reference\sap-exports\datastore-write-test\src\main\resources\scenarioflows\integrationflow\DataStoreWriteTest.iflw" | Select-String -Pattern "activityType|DataStore|WriteVariables|DBStorage" -Context 0,20
```

**Document**:
- `activityType` for Write operation
- `activityType` for Get operation
- `cmdVariantUri` for each operation type
- `componentVersion`
- All property keys for each operation

---

### Step 2: Implement Message Mapping (2-3 hours)

#### 2.1 Create MappingResource Class

**File**: `src/model/MappingResource.ts`

```typescript
import { Resource } from "./Resource";

/**
 * MappingResource - Represents a Message Mapping (.mmap) file
 * 
 * Evidence: [Document SAP export source here]
 * Lines: [Document line numbers]
 */
export class MappingResource implements Resource {
    readonly type = "mapping" as const;
    
    constructor(
        public readonly name: string,
        private readonly content?: string | Buffer,
        private readonly path?: string
    ) {
        if (!name.endsWith('.mmap')) {
            throw new Error('Mapping resource name must end with .mmap');
        }
        
        if (!content && !path) {
            throw new Error('Either content or path must be provided');
        }
    }
    
    async getContent(): Promise<string | Buffer> {
        if (this.content) {
            return this.content;
        }
        
        const fs = await import('fs/promises');
        return fs.readFile(this.path!, 'utf-8');
    }
    
    getPackagePath(): string {
        return `src/main/resources/mapping/${this.name}`;
    }
}
```

#### 2.2 Create MessageMapping SDK Class

**File**: `src/model/MessageMapping.ts`

```typescript
import { Component } from "./Component";

/**
 * MessageMapping - User-friendly API for SAP Message Mapping component
 * 
 * Evidence: [Document SAP export source]
 * 
 * SAP-compatible metadata:
 * - activityType: [Extract from SAP]
 * - cmdVariantUri: [Extract from SAP]
 * - componentVersion: [Extract from SAP]
 */
export class MessageMapping extends Component {
    
    constructor(
        name: string,
        mappingName: string,
        additionalProperties: Record<string, any> = {}
    ) {
        const id = `Mapping_${Date.now()}`;
        
        const properties = {
            mappingReference: mappingName,  // Adjust based on SAP evidence
            ...additionalProperties
        };
        
        // Component type to be determined from SAP export
        super(id, name, "MessageTransformBean", properties);  // PLACEHOLDER - update from SAP
    }
    
    public getMappingName(): string {
        return this.properties.mappingReference as string;
    }
}
```

#### 2.3 Update Registry

**File**: `src/registry/ComponentRegistry.ts`

```typescript
// Add after Enricher entry

/**
 * Message Mapping
 * Evidence: [SAP export source, lines X-Y]
 */
MessageTransformBean: {  // Update key from SAP evidence
    displayName: "Message Mapping",
    bpmnElement: "callActivity",
    activityType: "MessageTransformBean",  // Update from SAP
    metadata: {
        activityType: "MessageTransformBean",  // Update from SAP
        cmdVariantUri: "...",  // Extract from SAP
        componentVersion: "...",  // Extract from SAP
        defaultProperties: {
            // Extract from SAP export
        }
    }
}
```

#### 2.4 Update IflowPackager

**File**: `src/packager/IflowPackager.ts`

Add mapping resource routing (if not already present):

```typescript
// In packageResources() method, add:
case 'mapping':
    return path.join('src', 'main', 'resources', 'mapping', resource.name);
```

#### 2.5 Create Example

**File**: `examples/message-mapping.ts`

```typescript
import { IFlow, MessageMapping, MappingResource } from '../src/index';

const flow = new IFlow("MappingDemo");

const mapping = new MessageMapping(
    "Transform Order",
    "orderTransform.mmap"
);

const mappingFile = new MappingResource(
    "orderTransform.mmap",
    mappingContent  // Minimal .mmap file content
);

flow.addComponent(mapping);
flow.addResource(mappingFile);

// ... generate ZIP
```

#### 2.6 Test & Verify

```powershell
npm run build
npm run mapping  # Add script to package.json
```

- Import MappingDemo.zip into SAP
- Verify no validation errors
- Document any deviations from expected behavior

---

### Step 3: Implement Data Store (3-4 hours)

#### 3.1 Create DataStore SDK Class

**File**: `src/model/DataStore.ts`

```typescript
import { Component } from "./Component";

/**
 * DataStore - User-friendly API for SAP Data Store operations
 * 
 * Evidence: [Document SAP export sources]
 * 
 * Operations:
 * - Write: Store data
 * - Get: Retrieve data
 * - Delete: Remove data
 */
export class DataStore extends Component {
    
    static Write(
        name: string,
        dataStoreName: string,
        entryId: string,
        additionalProperties: Record<string, any> = {}
    ): DataStore {
        const id = `DataStore_Write_${Date.now()}`;
        
        const properties = {
            dataStoreName,
            entryId,
            operation: "write",  // Adjust from SAP evidence
            ...additionalProperties
        };
        
        return new DataStore(
            id,
            name,
            "WriteVariables",  // PLACEHOLDER - update from SAP
            properties
        );
    }
    
    static Get(
        name: string,
        dataStoreName: string,
        entryId: string,
        additionalProperties: Record<string, any> = {}
    ): DataStore {
        const id = `DataStore_Get_${Date.now()}`;
        
        const properties = {
            dataStoreName,
            entryId,
            operation: "get",  // Adjust from SAP evidence
            ...additionalProperties
        };
        
        return new DataStore(
            id,
            name,
            "GetVariables",  // PLACEHOLDER - update from SAP
            properties
        );
    }
    
    static Delete(
        name: string,
        dataStoreName: string,
        entryId: string,
        additionalProperties: Record<string, any> = {}
    ): DataStore {
        const id = `DataStore_Delete_${Date.now()}`;
        
        const properties = {
            dataStoreName,
            entryId,
            operation: "delete",  // Adjust from SAP evidence
            ...additionalProperties
        };
        
        return new DataStore(
            id,
            name,
            "DeleteVariables",  // PLACEHOLDER - update from SAP
            properties
        );
    }
}
```

#### 3.2 Update Registry

**File**: `src/registry/ComponentRegistry.ts`

```typescript
/**
 * Data Store Write
 * Evidence: [SAP export source]
 */
WriteVariables: {  // Update from SAP evidence
    displayName: "Data Store Write",
    bpmnElement: "callActivity",
    activityType: "WriteVariables",  // Update from SAP
    metadata: {
        activityType: "WriteVariables",
        cmdVariantUri: "...",  // Extract from SAP
        componentVersion: "...",
        defaultProperties: {
            // Extract from SAP
        }
    }
},

/**
 * Data Store Get
 * Evidence: [SAP export source]
 */
GetVariables: {  // Update from SAP evidence
    displayName: "Data Store Get",
    bpmnElement: "callActivity",
    activityType: "GetVariables",
    metadata: {
        activityType: "GetVariables",
        cmdVariantUri: "...",
        componentVersion: "...",
        defaultProperties: {
            // Extract from SAP
        }
    }
},

// Add Delete if it's a separate activityType
```

#### 3.3 Create Example

**File**: `examples/datastore.ts`

```typescript
import { IFlow, DataStore } from '../src/index';

const flow = new IFlow("DataStoreDemo");

// Write operation
const write = DataStore.Write(
    "Store Order",
    "OrderStore",
    "${header.orderId}"
);

// Get operation
const get = DataStore.Get(
    "Retrieve Order",
    "OrderStore",
    "${header.orderId}"
);

flow.addComponent(write);
flow.addComponent(get);
flow.connect(write, get);

// ... generate ZIP
```

#### 3.4 Test & Verify

```powershell
npm run build
npm run datastore
```

- Import DataStoreDemo.zip into SAP
- Verify Write operation works
- Verify Get operation works
- Test Delete if implemented

---

## Quality Gates Checklist

For each component, verify:

### ✅ Evidence Collection
- [ ] SAP export obtained
- [ ] .iflw file extracted
- [ ] Metadata documented with line numbers
- [ ] No metadata values invented

### ✅ Implementation
- [ ] SDK class created
- [ ] Registry entry added with evidence
- [ ] Example created
- [ ] package.json script added

### ✅ Verification
- [ ] TypeScript compiles (npm run build)
- [ ] ZIP generates successfully
- [ ] Imports into SAP without errors
- [ ] No validation markers in SAP UI
- [ ] Component behaves as expected

### ✅ Documentation
- [ ] Evidence source documented in code comments
- [ ] Example documented
- [ ] README updated
- [ ] V1.3 completion report updated

---

## Timeline Estimate

| Task | Time | Dependencies |
|------|------|--------------|
| Obtain SAP exports | 1 hour | SAP access |
| Extract Message Mapping metadata | 30 min | Export available |
| Implement Message Mapping | 2 hours | Metadata extracted |
| Test Message Mapping | 30 min | Implementation complete |
| Extract Data Store metadata | 30 min | Export available |
| Implement Data Store | 3 hours | Metadata extracted |
| Test Data Store | 1 hour | Implementation complete |
| Documentation | 1 hour | All tests passing |

**Total**: 9.5 hours (1.5 hours for exports, 8 hours for implementation & testing)

---

## Success Criteria

Sprint 1 will be **100% complete** when:

✅ Content Modifier: Complete (already verified)  
⏳ Message Mapping: 
  - [ ] SAP export obtained
  - [ ] SDK implemented
  - [ ] ZIP generates
  - [ ] SAP imports successfully
  - [ ] Zero validation errors

⏳ Data Store:
  - [ ] SAP exports obtained (Write, Get, Delete)
  - [ ] SDK implemented
  - [ ] ZIPs generate for all operations
  - [ ] SAP imports successfully
  - [ ] Zero validation errors

---

## Contact/Next Session Prep

Before next session, prepare:

1. **SAP Integration Suite Access**: Ensure you can create and export flows
2. **Export Files**: Have MessageMappingTest.zip and DataStoreTest.zip ready
3. **Component Details**: Note any special configuration needed for Message Mapping or Data Store
4. **Questions**: Document any SAP-specific questions about these components

---

## Alternative: Implement Available Components

If SAP exports cannot be obtained immediately, consider implementing components we DO have evidence for:

### Potential Candidates (Search Required)

1. **Aggregator**: Check Agg Test.iflw for aggregator metadata
2. **Splitter**: May exist in available exports
3. **Exception Subprocess**: Found in IPRO_SRM (activityType: ErrorEventSubProcessTemplate)
4. **Service Call**: May exist in IPRO exports

Run searches:
```powershell
cd C:\Sahas\adesso\CPI_AI\sap-integration-sdk

# Search for Aggregator
Get-Content "reference\sap-exports\agg-test\src\main\resources\scenarioflows\integrationflow\Agg Test.iflw" | Select-String -Pattern "Aggregator|Splitter" -Context 0,20

# Search for other components
Get-Content reference\sap-exports\**\*.iflw | Select-String -Pattern "activityType" | Select-Object -Unique
```

This would allow continued progress while waiting for Message Mapping/Data Store exports.

---

**Status**: Ready for SAP export collection phase

**Next Action**: Obtain SAP exports for Message Mapping and Data Store

---

**END OF NEXT STEPS DOCUMENT**
