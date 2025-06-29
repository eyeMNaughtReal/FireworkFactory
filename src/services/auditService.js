import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  where,
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

class AuditService {
  constructor() {
    this.collectionName = 'audit_logs';
    this.maxLogsPerCollection = 1000; // Prevent infinite growth
  }

  /**
   * Log an audit trail entry
   * @param {Object} auditData - Audit information
   * @param {string} auditData.action - The action performed (create, update, delete, view)
   * @param {string} auditData.collection - The collection affected
   * @param {string} auditData.documentId - The document ID affected
   * @param {Object} auditData.data - The data involved in the operation
   * @param {Object} auditData.metadata - Additional metadata
   */
  async logAction(auditData) {
    try {
      const auditEntry = {
        action: auditData.action,
        collection: auditData.collection,
        documentId: auditData.documentId || null,
        data: auditData.data || null,
        metadata: auditData.metadata || {},
        timestamp: Timestamp.now(),
        createdAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const auditRef = collection(db, this.collectionName);
      const docRef = await addDoc(auditRef, auditEntry);
      
      console.log(`Audit log created: ${docRef.id} for ${auditData.action} on ${auditData.collection}`);
      
      // Clean up old logs if needed (run periodically, not on every log)
      if (Math.random() < 0.01) { // 1% chance to trigger cleanup
        this.cleanupOldLogs(auditData.collection);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw error - audit logging shouldn't break the main operation
    }
  }

  /**
   * Get audit logs with filtering options
   * @param {Object} filters - Filter options
   * @param {string} filters.collection - Filter by collection
   * @param {string} filters.action - Filter by action
   * @param {number} filters.limit - Limit number of results (default: 100)
   * @returns {Array} Array of audit log entries
   */
  async getAuditLogs(filters = {}) {
    try {
      let auditQuery = collection(db, this.collectionName);
      
      // Apply filters
      if (filters.collection) {
        auditQuery = query(auditQuery, where('collection', '==', filters.collection));
      }
      
      if (filters.action) {
        auditQuery = query(auditQuery, where('action', '==', filters.action));
      }
      
      // Always order by timestamp and limit results
      auditQuery = query(
        auditQuery, 
        orderBy('timestamp', 'desc'), 
        limit(filters.limit || 100)
      );
      
      const querySnapshot = await getDocs(auditQuery);
      const logs = [];
      
      querySnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().createdAt)
        });
      });
      
      return logs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @returns {Object} Statistics about audit logs
   */
  async getAuditStatistics() {
    try {
      const logs = await this.getAuditLogs({ limit: 500 });
      
      const stats = {
        totalLogs: logs.length,
        actionCounts: {},
        collectionCounts: {},
        recentActivity: logs.slice(0, 10),
        activityByDay: {}
      };
      
      logs.forEach(log => {
        // Count by action
        stats.actionCounts[log.action] = (stats.actionCounts[log.action] || 0) + 1;
        
        // Count by collection
        stats.collectionCounts[log.collection] = (stats.collectionCounts[log.collection] || 0) + 1;
        
        // Activity by day
        const day = log.timestamp.toDateString();
        stats.activityByDay[day] = (stats.activityByDay[day] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error fetching audit statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs for a specific collection
   * @param {string} collectionName - Collection to clean up logs for
   */
  async cleanupOldLogs(collectionName) {
    try {
      const auditQuery = query(
        collection(db, this.collectionName),
        where('collection', '==', collectionName),
        orderBy('timestamp', 'desc'),
        limit(this.maxLogsPerCollection + 100) // Get a few extra to delete
      );
      
      const querySnapshot = await getDocs(auditQuery);
      
      if (querySnapshot.size > this.maxLogsPerCollection) {
        const logsToDelete = querySnapshot.docs.slice(this.maxLogsPerCollection);
        
        // Delete old logs in batches
        const batch = writeBatch(db);
        logsToDelete.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`Cleaned up ${logsToDelete.length} old audit logs for ${collectionName}`);
      }
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
    }
  }

  /**
   * Convenience methods for common audit actions
   */
  
  async logCreate(collection, documentId, data, metadata = {}) {
    return this.logAction({
      action: 'create',
      collection,
      documentId,
      data,
      metadata
    });
  }

  async logUpdate(collection, documentId, data, metadata = {}) {
    return this.logAction({
      action: 'update',
      collection,
      documentId,
      data,
      metadata: { ...metadata, previousData: metadata.previousData }
    });
  }

  async logDelete(collection, documentId, data, metadata = {}) {
    return this.logAction({
      action: 'delete',
      collection,
      documentId,
      data,
      metadata
    });
  }

  async logView(collection, documentId = null, metadata = {}) {
    return this.logAction({
      action: 'view',
      collection,
      documentId,
      metadata
    });
  }
}

// Create and export a singleton instance
const auditService = new AuditService();
export default auditService;
