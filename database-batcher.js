/**
 * Database Batching System
 * Optimizes database operations by batching updates and reducing API calls
 */

class DatabaseBatcher {
    constructor(supabaseClient, options = {}) {
        this.supabase = supabaseClient;
        this.options = {
            batchDelay: options.batchDelay || 500, // ms to wait before executing batch
            maxBatchSize: options.maxBatchSize || 20, // max operations per batch
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            ...options
        };

        this.pendingOperations = new Map();
        this.batchQueue = [];
        this.processingBatch = false;
        this.stats = {
            totalOperations: 0,
            batchedOperations: 0,
            savedRequests: 0,
            errors: 0
        };
    }

    /**
     * Add an update operation to the batch queue
     */
    queueUpdate(tableName, data, condition, priority = 'normal') {
        const operation = {
            type: 'update',
            tableName,
            data,
            condition,
            priority,
            timestamp: Date.now(),
            id: this.generateOperationId()
        };

        this.stats.totalOperations++;
        
        // For high priority operations, execute immediately
        if (priority === 'high') {
            return this.executeImmediate(operation);
        }

        // Add to batch queue
        this.batchQueue.push(operation);
        
        // Start batch processing if not already running
        if (!this.processingBatch) {
            this.scheduleBatchExecution();
        }

        return Promise.resolve({ queued: true, operationId: operation.id });
    }

    /**
     * Add an insert operation to the batch queue
     */
    queueInsert(tableName, data, priority = 'normal') {
        const operation = {
            type: 'insert',
            tableName,
            data,
            priority,
            timestamp: Date.now(),
            id: this.generateOperationId()
        };

        this.stats.totalOperations++;

        if (priority === 'high') {
            return this.executeImmediate(operation);
        }

        this.batchQueue.push(operation);

        if (!this.processingBatch) {
            this.scheduleBatchExecution();
        }

        return Promise.resolve({ queued: true, operationId: operation.id });
    }

    /**
     * Execute operation immediately (for high priority)
     */
    async executeImmediate(operation) {
        try {
            const result = await this.executeSingleOperation(operation);
            return { success: true, data: result };
        } catch (error) {
            this.stats.errors++;
            console.error('Immediate operation failed:', error);
            throw error;
        }
    }

    /**
     * Schedule batch execution with debouncing
     */
    scheduleBatchExecution() {
        clearTimeout(this.batchTimeout);
        
        this.batchTimeout = setTimeout(() => {
            this.processBatch();
        }, this.options.batchDelay);
    }

    /**
     * Process the current batch
     */
    async processBatch() {
        if (this.batchQueue.length === 0 || this.processingBatch) {
            return;
        }

        this.processingBatch = true;
        const operations = this.batchQueue.splice(0, this.options.maxBatchSize);
        
        console.log(`🔄 Processing batch of ${operations.length} operations`);

        try {
            await this.executeBatch(operations);
            this.stats.batchedOperations += operations.length;
            this.stats.savedRequests += Math.max(0, operations.length - 1);
            
            console.log(`✅ Batch completed successfully`);
        } catch (error) {
            console.error('❌ Batch processing failed:', error);
            this.stats.errors++;
            
            // Retry individual operations
            await this.retryOperations(operations);
        }

        this.processingBatch = false;

        // Process remaining operations if any
        if (this.batchQueue.length > 0) {
            setTimeout(() => this.processBatch(), 100);
        }
    }

    /**
     * Execute a batch of operations
     */
    async executeBatch(operations) {
        // Group operations by table and type
        const grouped = this.groupOperations(operations);

        const promises = [];

        for (const [tableType, ops] of grouped.entries()) {
            const [tableName, operationType] = tableType.split(':');
            
            if (operationType === 'update' && ops.length > 1) {
                // Use batch update for multiple updates
                promises.push(this.executeBatchUpdate(tableName, ops));
            } else if (operationType === 'insert' && ops.length > 1) {
                // Use batch insert for multiple inserts
                promises.push(this.executeBatchInsert(tableName, ops));
            } else {
                // Execute individual operations
                promises.push(...ops.map(op => this.executeSingleOperation(op)));
            }
        }

        return Promise.all(promises);
    }

    /**
     * Group operations by table and type
     */
    groupOperations(operations) {
        const grouped = new Map();

        operations.forEach(op => {
            const key = `${op.tableName}:${op.type}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(op);
        });

        return grouped;
    }

    /**
     * Execute batch update using PostgreSQL's batch update capability
     */
    async executeBatchUpdate(tableName, operations) {
        // Create batch update using upsert with conflict resolution
        const updates = operations.map(op => ({
            ...op.data,
            ...op.condition // Include the condition fields in the data
        }));

        const { data, error } = await this.supabase
            .from(tableName)
            .upsert(updates, { onConflict: Object.keys(operations[0].condition).join(',') });

        if (error) throw error;
        return data;
    }

    /**
     * Execute batch insert
     */
    async executeBatchInsert(tableName, operations) {
        const inserts = operations.map(op => op.data);

        const { data, error } = await this.supabase
            .from(tableName)
            .insert(inserts);

        if (error) throw error;
        return data;
    }

    /**
     * Execute single operation
     */
    async executeSingleOperation(operation) {
        let query = this.supabase.from(operation.tableName);

        switch (operation.type) {
            case 'update':
                query = query.update(operation.data);
                // Apply conditions
                for (const [key, value] of Object.entries(operation.condition)) {
                    query = query.eq(key, value);
                }
                break;
            
            case 'insert':
                query = query.insert(operation.data);
                break;
            
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    /**
     * Retry failed operations individually
     */
    async retryOperations(operations) {
        const retryPromises = operations.map(async (op) => {
            for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
                try {
                    await this.executeSingleOperation(op);
                    return;
                } catch (error) {
                    console.warn(`Retry ${attempt}/${this.options.retryAttempts} failed for operation:`, op.id);
                    if (attempt === this.options.retryAttempts) {
                        this.stats.errors++;
                        throw error;
                    }
                    await this.delay(this.options.retryDelay * attempt);
                }
            }
        });

        await Promise.allSettled(retryPromises);
    }

    /**
     * Generate unique operation ID
     */
    generateOperationId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get batching statistics
     */
    getStats() {
        const efficiency = this.stats.totalOperations > 0 ? 
            ((this.stats.savedRequests / this.stats.totalOperations) * 100).toFixed(2) : 0;
        
        return {
            ...this.stats,
            efficiency: `${efficiency}%`,
            queueLength: this.batchQueue.length,
            processing: this.processingBatch
        };
    }

    /**
     * Force immediate execution of all pending operations
     */
    async flush() {
        clearTimeout(this.batchTimeout);
        if (this.batchQueue.length > 0) {
            await this.processBatch();
        }
    }

    /**
     * Clear the queue and reset stats
     */
    reset() {
        clearTimeout(this.batchTimeout);
        this.batchQueue = [];
        this.processingBatch = false;
        this.stats = {
            totalOperations: 0,
            batchedOperations: 0,
            savedRequests: 0,
            errors: 0
        };
    }
}

// Enhanced save operations with batching
window.createDatabaseBatcher = function(supabaseClient) {
    return new DatabaseBatcher(supabaseClient, {
        batchDelay: 300, // Faster for real-time feel
        maxBatchSize: 15,
        retryAttempts: 2
    });
};

// Global batcher instance (initialized when supabase is ready)
window.dbBatcher = null;

// Initialize batcher when Supabase is available
function initializeBatcher() {
    if (window.supabase && !window.dbBatcher) {
        window.dbBatcher = window.createDatabaseBatcher(window.supabase);
        console.log('🚀 Database batcher initialized');
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Supabase to be available
    const checkSupabase = setInterval(() => {
        if (window.supabase) {
            clearInterval(checkSupabase);
            initializeBatcher();
        }
    }, 100);
    
    // Fallback timeout
    setTimeout(() => {
        clearInterval(checkSupabase);
        if (!window.dbBatcher) {
            console.warn('⚠️ Database batcher not initialized - Supabase not available');
        }
    }, 5000);
});

// Batched save function for cell updates
window.batchedCellSave = async function(rowId, columnName, value, priority = 'normal') {
    if (!window.dbBatcher) {
        console.warn('Database batcher not available, falling back to direct save');
        return window.supabase
            .from('staff-table')
            .update({ [columnName]: value })
            .eq('id', rowId);
    }
    
    return window.dbBatcher.queueUpdate(
        'staff-table',
        { [columnName]: value },
        { id: rowId },
        priority
    );
};

// Expose stats for monitoring
window.getBatcherStats = () => window.dbBatcher?.getStats() || { error: 'Batcher not initialized' };

console.log('📦 Database batching system loaded');