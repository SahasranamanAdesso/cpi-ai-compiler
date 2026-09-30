# Example Patterns

## Example 1: Simple message modification

```
const flow = new IFlow("MessageModifier");
const modifier = new Component("CallActivity_1", "Set Body", "Enricher");
modifier.properties.bodyType = "constant";
modifier.properties.body = "Modified message content";
flow.addComponent(modifier);
export default flow;
```

## Example 2: Multiple processing steps

```
const flow = new IFlow("MultiStep");

const step1 = new Component("CallActivity_1", "Add Timestamp", "Enricher");
step1.properties.bodyType = "constant";
step1.properties.body = "Step 1 completed";

const step2 = new Component("CallActivity_2", "Add Metadata", "Enricher");
step2.properties.bodyType = "constant";
step2.properties.body = "Step 2 completed";

flow.addComponent(step1);
flow.addComponent(step2);
flow.connect(step1, step2);

export default flow;
```

## Important Rules

- Always export default flow
- Component IDs must be unique
- Use "CallActivity_X" naming convention for component IDs
- componentType must be one of the supported types
