# Expression Language Reference

**Version**: 1.0  
**Purpose**: Document all supported expression types in SAP Integration Suite

---

## Overview

SAP Integration Suite supports multiple expression languages depending on context:

1. **Simple Expression Language** - Most common (headers, properties, routing)
2. **XPath** - XML message navigation
3. **Camel Simple** - Advanced expressions
4. **Groovy** - Via Groovy Script component

---

## 1. Simple Expression Language

### Syntax

```
${scope.variableName}
```

**Scopes**:
- `header` - Message headers
- `property` - Exchange properties
- `in.header` - Explicit input message header
- `out.header` - Output message header (rare)

### Variable Access

**Headers**:
```javascript
${header.Country}           // Access header named "Country"
${header.OrderType}         // Access header named "OrderType"
${in.header.MessageId}      // Explicit input header
```

**Properties**:
```javascript
${property.Status}          // Access property named "Status"
${property.ProcessingMode}  // Access property named "ProcessingMode"
```

### Comparison Operators

**CRITICAL**: SAP uses **single `=`**, not `==`

| Operator | Meaning | Example |
|----------|---------|---------|
| `=` | Equal | `${header.Country} = 'IN'` |
| `!=` | Not equal | `${header.Status} != 'FAILED'` |
| `>` | Greater than | `${header.Amount} > 1000` |
| `<` | Less than | `${header.Quantity} < 10` |
| `>=` | Greater or equal | `${header.Amount} >= 500` |
| `<=` | Less or equal | `${header.Quantity} <= 100` |

### String Literals

**CRITICAL**: Use **single quotes `'`**, not double quotes `"`

✅ Correct:
```javascript
${header.Country} = 'IN'
${header.Type} = 'urgent'
${header.Status} != 'FAILED'
```

❌ Wrong:
```javascript
${header.Country} == 'IN'      // Double equals
${header.Type} = "urgent"      // Double quotes
header.Status != 'FAILED'      // Missing ${}
```

### Logical Operators

```javascript
and   // Logical AND
or    // Logical OR
not   // Logical NOT
```

**Examples**:
```javascript
${header.Country} = 'IN' and ${header.Amount} > 1000
${header.Status} = 'urgent' or ${header.Priority} = 'high'
not (${header.Country} = 'US')
```

### Router Conditions

**Context**: Used in `Router.when(condition)`

**Examples**:
```typescript
router.when("${header.Country} = 'IN'")
router.when("${header.OrderType} = 'Standard'")
router.when("${header.Amount} > 1000")
router.when("${property.Status} = 'approved'")
router.when("${header.Country} = 'IN' and ${header.Amount} > 5000")
```

### Content Modifier Expressions

**Context**: Set header/property values dynamically

**Header Table** (expression type):
```xml
<row>
    <cell id='Action'>Create</cell>
    <cell id='Type'>expression</cell>
    <cell id='Value'>/Order/@Type</cell>  <!-- XPath -->
    <cell id='Name'>OrderType</cell>
</row>
```

**Property Table** (expression type):
```xml
<row>
    <cell id='Action'>Create</cell>
    <cell id='Type'>expression</cell>
    <cell id='Value'>${header.Country}</cell>
    <cell id='Name'>TargetCountry</cell>
</row>
```

### Date/Time Functions

```javascript
${date:now:yyyy-MM-dd}              // Current date
${date:now:yyyyMMdd_HHmmss}         // Timestamp
${date:header.OrderDate:yyyy-MM-dd} // Format header value
```

---

## 2. XPath Expressions

### Syntax

```
/path/to/element
/path/to/@attribute
```

### Context

- **Content Modifier** - Extract values from XML
- **Splitter** - Define split points
- **Gather** - Define aggregation paths
- **Router** - Evaluate XML content

### Examples

**Element Access**:
```xpath
/Order/OrderID                    // Single element
/Orders/Order[1]/OrderID          // First Order
/Order/Item/ProductID             // Nested element
```

**Attribute Access**:
```xpath
/Order/@Type                      // Order Type attribute
/Order/@xmlns:ns                  // Namespace attribute
```

**Predicates**:
```xpath
/Order[Amount > 1000]             // Filter by condition
/Order/Item[@ProductID='P123']    // Filter by attribute
/Order/Item[position() = 1]       // First item
```

**Functions**:
```xpath
count(/Order/Item)                // Count items
sum(/Order/Item/Price)            // Sum values
string(/Order/OrderID)            // Convert to string
```

### Splitter XPath

**Context**: `GeneralSplitter.splitExprValue`

```typescript
new Component("Splitter1", "Split Orders", "GeneralSplitter", {
    exprType: "XPath",
    splitExprValue: "/Orders/Order"  // Split each <Order>
})
```

**Examples**:
```xpath
/Orders/Order                     // Split by Order element
/Invoice/LineItem                 // Split invoice lines
/Batch/Transaction                // Split transactions
```

### Gather XPath

**Context**: Aggregation paths

```typescript
new Component("Gather1", "Aggregate Results", "Gather", {
    aggregationAlgorithm: "sap-identical-multi-mapping",
    targetXPath: "/Results/Result",
    sourceXPath: "/Result"
})
```

---

## 3. Camel Simple Language

### Advanced Expressions

**File Operations**:
```javascript
${file:name}                      // File name
${file:name.noext}                // File name without extension
${file:ext}                       // File extension
${file:size}                      // File size
```

**Body Access**:
```javascript
${body}                           // Full message body
${bodyAs(String)}                 // Body as String
${bodyAs(java.lang.Integer)}      // Body as Integer
```

**String Functions**:
```javascript
${header.Name.toUpperCase()}      // Convert to uppercase
${header.Name.toLowerCase()}      // Convert to lowercase
${header.Name.length()}           // String length
${header.Name.substring(0,5)}     // Substring
```

**Null Handling**:
```javascript
${header.Name} != null            // Check if header exists
${header.Name} =~ 'regex'         // Regex match
```

---

## 4. Groovy Expressions

### Context

Only in **Groovy Script** component

### Message Access

```groovy
import com.sap.gateway.ip.core.customdev.util.Message

def Message processData(Message message) {
    // Get body
    def body = message.getBody(String.class)
    
    // Get headers
    def country = message.getHeader("Country", String.class)
    def amount = message.getHeader("Amount", Integer.class)
    
    // Set headers
    message.setHeader("ProcessedBy", "GroovyScript")
    message.setHeader("Timestamp", new Date().toString())
    
    // Get properties
    def prop = message.getProperty("Status", String.class)
    
    // Set properties
    message.setProperty("Stage", "Processing")
    
    // Set body
    message.setBody(body.toUpperCase())
    
    return message
}
```

### JSON Parsing

```groovy
import groovy.json.JsonSlurper
import groovy.json.JsonOutput

def jsonSlurper = new JsonSlurper()
def json = jsonSlurper.parseText(body)

// Access fields
def orderId = json.OrderID
def items = json.Items

// Modify
json.ProcessedAt = new Date().format("yyyy-MM-dd'T'HH:mm:ss")

// Serialize back
def output = JsonOutput.toJson(json)
message.setBody(output)
```

### XML Processing

```groovy
def xml = new XmlSlurper().parseText(body)

// Access elements
def orderId = xml.OrderID.text()
def items = xml.Item

// Modify
xml.Status = 'Processed'

// Serialize back
def output = groovy.xml.XmlUtil.serialize(xml)
message.setBody(output)
```

---

## Expression Context Matrix

| Component | Supported Languages | Common Use |
|-----------|-------------------|------------|
| Content Modifier (header) | Simple, XPath | Extract XML values |
| Content Modifier (property) | Simple | Copy headers to properties |
| Content Modifier (body) | Simple, Constant | Set static or dynamic body |
| Router | Simple | Conditional routing |
| Splitter | XPath, Token | Define split points |
| Gather | XPath | Aggregation paths |
| XML Validator | XPath (in XSD) | Schema validation |
| XSLT Mapping | XSLT, XPath | Transformation |
| Groovy Script | Groovy | Full programming |
| Data Store | Simple | Entry ID expressions |

---

## Common Patterns

### Dynamic File Naming
```javascript
// SFTP receiver fileName
"ORDER_${date:now:yyyyMMdd_HHmmss}.xml"
```

### Conditional Header
```typescript
// Content Modifier
{
    headerTable: `<row>
        <cell id='Action'>Create</cell>
        <cell id='Type'>expression</cell>
        <cell id='Value'>${header.Amount} > 1000 ? 'high' : 'low'</cell>
        <cell id='Name'>Priority</cell>
    </row>`
}
```

### Multi-Condition Router
```typescript
router.when("${header.Country} = 'IN' and ${header.Amount} > 5000")
      .when("${header.Country} = 'US'")
      .otherwise()
```

### XPath Split + Extract
```typescript
// Splitter
{
    exprType: "XPath",
    splitExprValue: "/Orders/Order"
}

// Content Modifier (after split)
{
    headerTable: `<row>
        <cell id='Type'>expression</cell>
        <cell id='Value'>/Order/OrderID</cell>
        <cell id='Name'>CurrentOrderID</cell>
    </row>`
}
```

---

## Validation Rules

1. ✅ Simple expressions use `${}` wrapper
2. ✅ Comparisons use single `=` not `==`
3. ✅ String literals use single quotes `'` not `"`
4. ✅ XPath starts with `/` for absolute paths
5. ✅ Groovy must return `Message` object
6. ❌ Never mix expression types in same context
7. ❌ Never use JavaScript syntax (`===`, `let`, `const`)
