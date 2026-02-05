package expo.modules.audioeffects

import android.util.Log
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicInteger

/**
 * Thread-safe ByteBuffer pool for audio processing.
 * Reuses buffers to reduce GC pressure and memory allocation overhead.
 * 
 * Features:
 * - Thread-safe using ConcurrentLinkedQueue
 * - Auto-sizing: creates new buffers when pool is empty
 * - Size-based pooling: pools buffers by size category
 * - Memory limits: caps total pooled memory
 */
class ByteBufferPool private constructor() {
    
    companion object {
        private const val TAG = "ByteBufferPool"
        
        private const val MAX_POOL_SIZE_BYTES = 2 * 1024 * 1024
        
        private const val SMALL_SIZE = 4096
        private const val MEDIUM_SIZE = 16384
        private const val LARGE_SIZE = 65536
        
        @Volatile
        private var instance: ByteBufferPool? = null
        
        fun getInstance(): ByteBufferPool {
            return instance ?: synchronized(this) {
                instance ?: ByteBufferPool().also { instance = it }
            }
        }
    }
    
    private data class SizedPool(
        val size: Int,
        val pool: ConcurrentLinkedQueue<ByteBuffer> = ConcurrentLinkedQueue(),
        val count: AtomicInteger = AtomicInteger(0)
    )
    
    private val smallPool = SizedPool(SMALL_SIZE)
    private val mediumPool = SizedPool(MEDIUM_SIZE)
    private val largePool = SizedPool(LARGE_SIZE)
    private val oversizedPool = ConcurrentLinkedQueue<ByteBuffer>()
    
    private val totalPooledBytes = AtomicInteger(0)
    private val allocations = AtomicInteger(0)
    private val reuses = AtomicInteger(0)
    
    /**
     * Acquire a ByteBuffer of at least the specified size.
     * Will return a pooled buffer if available, otherwise allocates a new one.
     */
    fun acquire(minSize: Int): ByteBuffer {
        val pool = getPoolForSize(minSize)
        
        if (pool != null) {
            val buffer = pool.pool.poll()
            if (buffer != null && buffer.capacity() >= minSize) {
                buffer.clear()
                buffer.order(ByteOrder.nativeOrder())
                reuses.incrementAndGet()
                pool.count.decrementAndGet()
                totalPooledBytes.addAndGet(-buffer.capacity())
                return buffer
            }
        }
        
        val oversized = oversizedPool.poll()
        if (oversized != null && oversized.capacity() >= minSize) {
            oversized.clear()
            oversized.order(ByteOrder.nativeOrder())
            reuses.incrementAndGet()
            totalPooledBytes.addAndGet(-oversized.capacity())
            return oversized
        }
        
        val newBuffer = ByteBuffer.allocateDirect(roundUpSize(minSize)).apply {
            order(ByteOrder.nativeOrder())
        }
        allocations.incrementAndGet()
        return newBuffer
    }
    
    /**
     * Release a ByteBuffer back to the pool for reuse.
     */
    fun release(buffer: ByteBuffer) {
        if (!buffer.isDirect) {
            return
        }
        
        val capacity = buffer.capacity()
        
        if (totalPooledBytes.get() + capacity > MAX_POOL_SIZE_BYTES) {
            return
        }
        
        buffer.clear()
        
        val pool = getPoolForSize(capacity)
        if (pool != null && capacity == pool.size) {
            pool.pool.offer(buffer)
            pool.count.incrementAndGet()
            totalPooledBytes.addAndGet(capacity)
        } else if (capacity > LARGE_SIZE) {
            if (oversizedPool.size < 4) {
                oversizedPool.offer(buffer)
                totalPooledBytes.addAndGet(capacity)
            }
        }
    }
    
    /**
     * Clear all pooled buffers to free memory.
     */
    fun clear() {
        smallPool.pool.clear()
        smallPool.count.set(0)
        mediumPool.pool.clear()
        mediumPool.count.set(0)
        largePool.pool.clear()
        largePool.count.set(0)
        oversizedPool.clear()
        totalPooledBytes.set(0)
        
        Log.d(TAG, "Pool cleared - freed ${totalPooledBytes.get()} bytes")
    }
    
    /**
     * Get pool statistics for monitoring.
     */
    fun getStats(): Map<String, Any> {
        return mapOf(
            "totalPooledBytes" to totalPooledBytes.get(),
            "smallPoolCount" to smallPool.count.get(),
            "mediumPoolCount" to mediumPool.count.get(),
            "largePoolCount" to largePool.count.get(),
            "oversizedPoolCount" to oversizedPool.size,
            "totalAllocations" to allocations.get(),
            "totalReuses" to reuses.get(),
            "reuseRate" to if (allocations.get() + reuses.get() > 0) {
                (reuses.get().toFloat() / (allocations.get() + reuses.get()) * 100).toInt()
            } else 0
        )
    }
    
    private fun getPoolForSize(size: Int): SizedPool? {
        return when {
            size <= SMALL_SIZE -> smallPool
            size <= MEDIUM_SIZE -> mediumPool
            size <= LARGE_SIZE -> largePool
            else -> null
        }
    }
    
    private fun roundUpSize(size: Int): Int {
        return when {
            size <= SMALL_SIZE -> SMALL_SIZE
            size <= MEDIUM_SIZE -> MEDIUM_SIZE
            size <= LARGE_SIZE -> LARGE_SIZE
            else -> ((size + 4095) / 4096) * 4096
        }
    }
}
