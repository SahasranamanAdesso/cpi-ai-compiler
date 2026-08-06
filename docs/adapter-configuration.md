# Adapter Configuration Reference

**Version**: 1.0  
**Purpose**: Complete configuration guide for all supported adapters

---

## HTTP/HTTPS Adapter

### Purpose
Send or receive HTTP/HTTPS messages

### Sender Configuration

**Required Properties**:
- `address` - URL path (e.g., "/api/orders")

**Optional Properties**:
- `protocol` - "HTTP" | "HTTPS" (default: "HTTPS")
- `allowedMethods` - Array of HTTP methods (default: ["POST"])
- `authentication` - "None" | "Basic" | "ClientCertificate" | "RoleBased" (default: "RoleBased")
- `userRole` - Role name (default: "ESBMessaging.send")
- `maximumBodySize` - Max body size in MB (default: 40)

**Example**:
```typescript
HttpAdapter.sender({
    address: "/api/orders",
    allowedMethods: ["POST", "GET"],
    authentication: "RoleBased",
    userRole: "ESBMessaging.send"
})
```

### Receiver Configuration

**Required Properties**:
- None (all optional)

**Optional Properties**:
- `url` - Target URL (can be set dynamically via header)
- `method` - "GET" | "POST" | "PUT" | "DELETE" | "PATCH" (default: "POST")
- `protocol` - "HTTP" | "HTTPS" (default: "HTTP")
- `authentication` - "None" | "Basic" | "OAuth2" | "ClientCertificate" (default: "None")
- `credentialName` - Credential alias
- `timeout` - Timeout in ms (default: 60000)
- `allowedResponseHeaders` - Response headers to capture (default: "*")

**Example**:
```typescript
HttpAdapter.receiver({
    url: "https://api.example.com/orders",
    method: "POST",
    authentication: "Basic",
    credentialName: "API_CREDS",
    timeout: 30000
})
```

**Placeholder Rules**:
- `url` can be omitted and set via `${header.target_url}` at runtime

---

## OData Adapter

### Purpose
Call OData V2/V4 services (SAP and external)

### Sender Configuration

**Required Properties**:
- `name` - Adapter display name
- `resourcePath` - OData entity set (e.g., "Orders")

**Optional Properties**:
- `version` - "V2" | "V4" (default: "V2")
- `pollingInterval` - Polling frequency in ms (default: 60000)
- `authentication` - "None" | "Basic" | "OAuth2" (default: "None")
- `credentialName` - Credential alias
- `filter` - OData $filter expression
- `select` - OData $select fields

**Example**:
```typescript
ODataAdapter.sender({
    name: "Poll Orders",
    resourcePath: "Orders",
    filter: "Status eq 'New'",
    pollingInterval: 300000
})
```

### Receiver Configuration

**Required Properties**:
- `name` - Adapter display name
- `resourcePath` - OData entity set
- `operation` - "Create" | "Read" | "Update" | "Delete" | "Query"

**Optional Properties**:
- `address` - Base OData service URL (can be empty, set at deployment)
- `version` - "V2" | "V4" (default: "V2")
- `authentication` - "None" | "Basic" | "OAuth2" | "ClientCertificate" (default: "None")
- `credentialName` - Credential alias
- `timeout` - Timeout in ms (default: 60000)
- `filter` - $filter (Query operation only)
- `select` - $select (Query operation only)
- `expand` - $expand (Query operation only)
- `top` - $top limit (Query operation only)
- `skip` - $skip offset (Query operation only)

**Example**:
```typescript
ODataAdapter.receiver({
    name: "Create Order",
    resourcePath: "OrderCollection",
    operation: "Create",
    address: "https://s4hana.example.com/odata/v2",
    authentication: "Basic",
    credentialName: "SAP_CREDS"
})
```

**Placeholder Rules**:
- `address` can be empty (configured at deployment)

---

## SFTP Adapter

### Purpose
Read/write files via SFTP

### Sender Configuration

**Required Properties**:
- `host` - SFTP server hostname
- `directory` - Directory path
- `filePattern` - File pattern (e.g., "*.csv")

**Optional Properties**:
- `authentication` - "User Credentials" | "Public Key" (default: "User Credentials")
- `credentialName` - Credential alias
- `port` - SFTP port (default: 22)
- `archiveDirectory` - Move processed files to
- `pollingInterval` - Cron expression (default: "0 */10 * * * ?")
- `maximumFileSize` - Max file size in MB (default: 40)
- `sortBy` - "Name" | "Date" | "Size" (default: "Date")
- `sortOrder` - "asc" | "desc" (default: "asc")

**Example**:
```typescript
SftpAdapter.sender({
    host: "sftp.partner.com",
    directory: "/incoming/orders",
    filePattern: "ORDER_*.csv",
    archiveDirectory: "/archive",
    pollingInterval: "0 0 * * * ?"  // Hourly
})
```

### Receiver Configuration

**Required Properties**:
- `host` - SFTP server hostname
- `directory` - Target directory
- `fileName` - Target filename (supports expressions)

**Optional Properties**:
- `authentication` - "User Credentials" | "Public Key" (default: "User Credentials")
- `credentialName` - Credential alias
- `port` - SFTP port (default: 22)
- `appendTimestamp` - Add timestamp to filename (default: false)
- `createDirectory` - Auto-create directory (default: false)

**Example**:
```typescript
SftpAdapter.receiver({
    host: "sftp.partner.com",
    directory: "/outgoing",
    fileName: "ORDER_${date:now:yyyyMMdd}.csv",
    appendTimestamp: true
})
```

**Placeholder Rules**:
- All SFTP properties use `{{placeholder}}` syntax in generated .iflw
- Actual values configured at deployment via SAP UI

---

## SOAP Adapter

### Purpose
Call SOAP 1.1/1.2 web services

### Sender Configuration

**Required Properties**:
- `address` - URL path
- `wsdlUrl` - WSDL location

**Optional Properties**:
- `soapVersion` - "1.1" | "1.2" (default: "1.1")
- `authentication` - "None" | "Basic" | "ClientCertificate" (default: "None")

**Example**:
```typescript
SoapAdapter.sender({
    address: "/soap/orders",
    wsdlUrl: "http://example.com/service?wsdl",
    soapVersion: "1.2"
})
```

### Receiver Configuration

**Required Properties**:
- `url` - SOAP endpoint URL
- `wsdlUrl` - WSDL location

**Optional Properties**:
- `soapVersion` - "1.1" | "1.2" (default: "1.1")
- `authentication` - "None" | "Basic" | "ClientCertificate" (default: "None")
- `credentialName` - Credential alias
- `operation` - SOAP operation name
- `timeout` - Timeout in ms (default: 60000)

**Example**:
```typescript
SoapAdapter.receiver({
    url: "https://api.example.com/soap",
    wsdlUrl: "https://api.example.com/service?wsdl",
    operation: "CreateOrder",
    authentication: "Basic",
    credentialName: "SOAP_CREDS"
})
```

---

## IDoc Adapter

### Purpose
Send/receive SAP IDocs

### Sender Configuration

**Required Properties**:
- None (all configured at deployment)

**Optional Properties**:
- `version` - IDoc version

**Example**:
```typescript
IdocAdapter.sender({
    version: "3"
})
```

### Receiver Configuration

**Required Properties**:
- None (all configured at deployment)

**Optional Properties**:
- `version` - IDoc version
- `timeout` - Timeout in ms (default: 60000)

**Example**:
```typescript
IdocAdapter.receiver({
    version: "3",
    timeout: 120000
})
```

**Note**: IDoc configuration (system, client, etc.) managed via SAP UI at deployment

---

## Common Patterns

### Dynamic URL (HTTP/OData)
```typescript
// Omit URL in adapter
HttpAdapter.receiver({
    method: "POST"
})

// Set at runtime via Content Modifier
new Component("SetURL", "Set Target", "Enricher", {
    headerTable: "<row><cell id='Action'>Create</cell>...
        <cell id='Value'>https://api.example.com</cell>
        <cell id='Name'>target_url</cell></row>"
})
```

### Credential Placeholders
```typescript
// Reference credential alias
{
    credentialName: "SAP_CREDS",
    authentication: "Basic"
}

// Actual credentials deployed to SAP Security Material
```

### File Patterns (SFTP)
```typescript
filePattern: "ORDER_*.csv"        // Wildcard
fileName: "ORDER_${date:now:yyyyMMdd_HHmmss}.xml"  // Expression
```

---

## Validation Rules

### All Adapters
- Sender: Exactly ONE per flow
- Receiver: At least ONE per flow
- `name` must be valid XML NCName (no spaces in technical name)

### HTTP/HTTPS
- `address` must start with `/`
- `url` (receiver) must be valid HTTP(S) URL or omitted

### OData
- `resourcePath` must be valid OData entity set name
- `operation` must match OData V2/V4 spec
- `address` can be empty (configured later)

### SFTP
- `host` required
- `directory` must be absolute path
- `filePattern` required for sender
- `fileName` required for receiver

### SOAP
- `wsdlUrl` must be accessible URL
- `operation` (receiver) must match WSDL

### IDoc
- Most configuration deferred to SAP deployment
