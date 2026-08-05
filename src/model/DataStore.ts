import { Component } from "./Component";

/**
 * DataStore - SAP Data Store operations for message persistence
 *
 * Evidence Sources:
 * - ARR-2026-07-15.md lines 233-240 (Write operation properties)
 * - ComponentRegistry.ts lines 178-188 (DBStorage metadata)
 * - activityType: "DBStorage"
 * - cmdVariantUri: "ctype::FlowstepVariant/cname::DBStorage/version::1.0.0"
 *
 * SAP Data Store enables temporary message storage with:
 * - Write: Store message data with entry ID
 * - Get: Retrieve stored message by entry ID
 * - Delete: Remove stored message by entry ID
 *
 * Properties:
 * - operation: "put" | "get" | "delete"
 * - storageName: Data store name
 * - entryId: Unique identifier (supports SAP expressions like ${header.id})
 * - visibility: "local" | "global" (default: "local")
 * - encrypt: true | false (default: true)
 * - expire: TTL in days (default: 30)
 */
export class DataStore extends Component {

    /**
     * Create a Data Store Write operation
     *
     * Stores the current message body in the data store with the specified entry ID.
     *
     * @param name Display name for this step
     * @param storageName Name of the data store
     * @param entryId Unique identifier for the entry (supports SAP expressions)
     * @param options Optional configuration
     *
     * @example
     * const write = DataStore.Write(
     *     "Store Order",
     *     "OrderStore",
     *     "${header.orderId}",
     *     { visibility: "global", expire: 90 }
     * );
     */
    static Write(
        name: string,
        storageName: string,
        entryId: string,
        options: {
            visibility?: "local" | "global";
            encrypt?: boolean;
            expire?: number;
        } = {}
    ): DataStore {
        const id = `DataStore_Write_${Date.now()}`;

        const properties = {
            operation: "put",
            storageName,
            entryId,  // Required for all operations
            visibility: options.visibility || "local",
            encrypt: options.encrypt !== undefined ? String(options.encrypt) : "true",
            expire: options.expire !== undefined ? String(options.expire) : "30"
        };

        return new DataStore(id, name, "DBStorage", properties);
    }

    /**
     * Create a Data Store Get operation
     *
     * Retrieves a message from the data store by entry ID and sets it as the message body.
     *
     * @param name Display name for this step
     * @param storageName Name of the data store
     * @param entryId Unique identifier for the entry to retrieve
     *
     * @example
     * const get = DataStore.Get(
     *     "Retrieve Order",
     *     "OrderStore",
     *     "${header.orderId}"
     * );
     */
    static Get(
        name: string,
        storageName: string,
        entryId: string
    ): DataStore {
        const id = `DataStore_Get_${Date.now()}`;

        const properties = {
            operation: "get",
            storageName,
            entryId
        };

        return new DataStore(id, name, "DBStorage", properties);
    }

    /**
     * Create a Data Store Delete operation
     *
     * Removes a message from the data store by entry ID.
     *
     * @param name Display name for this step
     * @param storageName Name of the data store
     * @param entryId Unique identifier for the entry to delete
     *
     * @example
     * const del = DataStore.Delete(
     *     "Remove Order",
     *     "OrderStore",
     *     "${header.orderId}"
     * );
     */
    static Delete(
        name: string,
        storageName: string,
        entryId: string
    ): DataStore {
        const id = `DataStore_Delete_${Date.now()}`;

        const properties = {
            operation: "delete",
            storageName,
            entryId
        };

        return new DataStore(id, name, "DBStorage", properties);
    }

    /**
     * Get the data store name
     */
    getStorageName(): string {
        return this.properties.storageName as string;
    }

    /**
     * Get the entry ID expression
     */
    getEntryId(): string {
        return this.properties.entryId as string;
    }

    /**
     * Get the operation type
     */
    getOperation(): string {
        return this.properties.operation as string;
    }
}
