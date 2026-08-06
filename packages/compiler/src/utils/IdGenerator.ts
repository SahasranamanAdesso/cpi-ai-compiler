/**
 * IdGenerator - Generates unique IDs for BPMN elements
 *
 * In BPMN, every element (participant, activity, flow, event) needs a unique ID.
 * SAP CPI generates IDs like:
 *   - Participant_1
 *   - CallActivity_3
 *   - SequenceFlow_5
 *   - StartEvent_1
 *
 * This class ensures that developers never have to manually specify IDs.
 * The SDK handles ID generation automatically.
 *
 * Example:
 *   IdGenerator.next("Sender")         → "Sender_1"
 *   IdGenerator.next("Sender")         → "Sender_2"
 *   IdGenerator.next("ContentModifier") → "ContentModifier_1"
 */
export class IdGenerator {
    /**
     * Internal counter for generating sequential IDs
     */
    private static counter = 1;

    /**
     * Generates the next unique ID with the given prefix
     * @param prefix - The prefix for the ID (e.g., "Sender", "Receiver", "SequenceFlow")
     * @returns A unique ID in the format "{prefix}_{number}"
     */
    public static next(prefix: string): string {
        return `${prefix}_${this.counter++}`;
    }

    /**
     * Resets the counter (useful for testing)
     */
    public static reset(): void {
        this.counter = 1;
    }
}
