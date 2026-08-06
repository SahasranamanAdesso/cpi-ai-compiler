import { Component } from "./Component";

/**
 * Multicast - SAP Parallel Multicast (parallel gateway)
 *
 * Evidence Source:
 * - IPRO_SRM_MM_MAIN.iflw lines 1397-1421
 * - BPMN Element: parallelGateway
 * - activityType: "Multicast"
 * - cmdVariantUri: "ctype::FlowstepVariant/cname::Multicast/version::1.1.1"
 * - componentVersion: "1.1"
 * - subActivityType: "parallel"
 *
 * SAP Multicast enables parallel processing:
 * - Sends message to multiple receivers simultaneously
 * - Each branch processes independently
 * - No conditional logic (all branches execute)
 *
 * Similar to Router but:
 * - Router (exclusiveGateway): ONE path chosen based on condition
 * - Multicast (parallelGateway): ALL paths execute in parallel
 *
 * Use cases:
 * - Send order to multiple systems (CRM, Warehouse, Billing)
 * - Parallel transformations
 * - Fan-out pattern
 */
export class Multicast extends Component {
    private branches: number = 0;

    /**
     * Create a Multicast gateway
     *
     * @param name Display name for this gateway
     *
     * @example
     * const multicast = new Multicast("Send to Multiple Systems");
     * flow.addComponent(multicast);
     * flow.addComponent(crmReceiver);
     * flow.addComponent(warehouseReceiver);
     * flow.connect(multicast, crmReceiver);
     * flow.connect(multicast, warehouseReceiver);
     */
    constructor(name: string) {
        const id = `Multicast_${Date.now()}`;

        // Multicast uses special component type to signal parallelGateway
        super(id, name, "Multicast", {});
    }

    /**
     * Get the number of outgoing branches
     */
    getBranchCount(): number {
        return this.branches;
    }

    /**
     * Internal: Track branch added
     */
    addBranch(): void {
        this.branches++;
    }
}
