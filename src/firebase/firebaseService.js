import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  limit,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config.js';
import auditService from '../services/auditService.js';

// Cache expiration time (30 minutes)
const CACHE_EXPIRATION = 30 * 60 * 1000;

class FirebaseService {
  constructor() {
    this.collections = {
      PRODUCTS: 'products',
      CATEGORIES: 'categories', 
      VENDORS: 'vendors',
      ORDERS: 'orders',
      INVENTORY: 'inventory',
      NOTIFICATIONS: 'notifications',
      AUDIT_LOG: 'audit_logs',
      REPORTS: 'reports'
    };
  }

  // localStorage cache management
  getCachedData(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      if (now - timestamp > CACHE_EXPIRATION) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Error reading cache:', error);
      return null;
    }
  }

  setCachedData(key, data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error setting cache:', error);
    }
  }

  clearCache(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  }

  // Generic CRUD operations
  async getCollection(collectionName, useCache = true) {
    const cacheKey = `cached_${collectionName}`;
    
    // Try cache first if enabled
    if (useCache) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ 
          id: doc.id, 
          ...doc.data() 
        });
      });
      
      // Cache the data
      if (useCache) {
        this.setCachedData(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      
      // Return cached data as fallback
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
      
      throw error;
    }
  }

  async getDocument(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error fetching document ${docId} from ${collectionName}:`, error);
      throw error;
    }
  }

  async addDocument(collectionName, data, metadata = null) {
    console.log('firebaseService.addDocument payload:', collectionName, data);
    try {
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, collectionName), docData);
      
      // Clear cache to force refresh
      this.clearCache(`cached_${collectionName}`);
      
      // Enhance metadata with collection-specific information
      const enhancedMetadata = { 
        ...metadata,
        documentType: collectionName,
        operation: 'create',
      };
      
      // For inventory items, add product info
      if (collectionName === this.collections.INVENTORY && data.productId) {
        enhancedMetadata.productId = data.productId;
      }
      
      // Log audit entry with enhanced metadata
      await this.logAuditEntry(collectionName, 'create', docRef.id, data, enhancedMetadata);
      
      // Fetch the document again to get resolved timestamps
      const snap = await getDoc(docRef);
      return { id: docRef.id, ...snap.data() };
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  }

  async updateDocument(collectionName, docId, data, metadata = null) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      // Get the current document data before update (if needed for audit trail)
      let previousData = null;
      if (!metadata?.previousData) {
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            previousData = docSnap.data();
          }
        } catch (err) {
          console.warn('Could not get previous data for audit log:', err);
        }
      }
      
      await updateDoc(docRef, docData);
      
      // Clear cache to force refresh
      this.clearCache(`cached_${collectionName}`);
      
      // Enhance metadata
      const enhancedMetadata = { 
        ...metadata,
        documentType: collectionName,
        operation: 'update',
      };
      
      // Add previous data to metadata if we retrieved it and it's not already there
      if (previousData && !enhancedMetadata.previousData) {
        enhancedMetadata.previousData = previousData;
      }
      
      // For inventory updates, add specific information
      if (collectionName === this.collections.INVENTORY) {
        if (previousData?.productId) {
          enhancedMetadata.productId = previousData.productId;
        } else if (data.productId) {
          enhancedMetadata.productId = data.productId;
        }
      }
      
      // Log audit entry with enhanced metadata
      await this.logAuditEntry(collectionName, 'update', docId, data, enhancedMetadata);
      
      return { id: docId, ...docData };
    } catch (error) {
      console.error(`Error updating document ${docId} in ${collectionName}:`, error);
      throw error;
    }
  }

  async deleteDocument(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      
      // Clear cache to force refresh
      this.clearCache(`cached_${collectionName}`);
      
      // Log audit entry
      await this.logAuditEntry(collectionName, 'delete', docId);
      
      return true;
    } catch (error) {
      console.error(`Error deleting document ${docId} from ${collectionName}:`, error);
      throw error;
    }
  }

  // Audit logging
  async logAuditEntry(collectionName, action, documentId, details = null, customMetadata = null) {
    try {
      const metadata = {
        userId: 'system', // TODO: Replace with actual user ID when auth is implemented
        source: 'firebase_service',
        timestamp: new Date().toISOString(),
        ...customMetadata
      };
      
      await auditService.logAction({
        action,
        collection: collectionName,
        documentId,
        data: details,
        metadata
      });
      
      return true;
    } catch (error) {
      console.warn('Failed to log audit entry:', error);
      // Don't throw error for audit logging failures
      return false;
    }
  }

  // Notification management
  async addNotification(type, message, data = null) {
    try {
      const notification = {
        type, // 'low_inventory', 'order_update', 'general'
        message,
        data,
        isRead: false,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.collections.NOTIFICATIONS), notification);
      
      // Clear notifications cache
      this.clearCache(`cached_${this.collections.NOTIFICATIONS}`);
      
      return { id: docRef.id, ...notification };
    } catch (error) {
      console.error('Error adding notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      await this.updateDocument(this.collections.NOTIFICATIONS, notificationId, {
        isRead: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Low inventory checking
  async checkLowInventory(products, inventory) {
    const lowStockItems = [];
    
    products.forEach(product => {
      const inventoryItem = inventory.find(inv => inv.productId === product.id);
      const currentStock = inventoryItem ? inventoryItem.quantity : 0;
      const thresholdInItems = product.thresholdInItems || product.lowInventoryThreshold || 0;
      
      if (currentStock <= thresholdInItems) {
        lowStockItems.push({
          productId: product.id,
          productName: product.name,
          currentStock,
          threshold: thresholdInItems
        });
      }
    });
    
    // Create notifications for low stock items
    for (const item of lowStockItems) {
      await this.addNotification(
        'low_inventory',
        `Low stock alert: ${item.productName} (${item.currentStock} remaining)`,
        item
      );
    }
    
    return lowStockItems;
  }

  // Real-time listeners
  subscribeToCollection(collectionName, callback) {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      callback(data);
    }, (error) => {
      console.error(`Error in ${collectionName} subscription:`, error);
    });
  }

  // Specific collection methods
  async getCategories() {
    return this.getCollection(this.collections.CATEGORIES);
  }

  async getVendors() {
    return this.getCollection(this.collections.VENDORS);
  }

  async getProducts() {
    return this.getCollection(this.collections.PRODUCTS);
  }

  async getOrders() {
    return this.getCollection(this.collections.ORDERS);
  }

  async getInventory() {
    return this.getCollection(this.collections.INVENTORY);
  }

  async getNotifications(unreadOnly = false) {
    try {
      let q = collection(db, this.collections.NOTIFICATIONS);
      
      if (unreadOnly) {
        q = query(q, where('isRead', '==', false));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });
      
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async getAuditLogs(collectionFilter = null, limitCount = 100) {
    try {
      let q = collection(db, this.collections.AUDIT_LOG);
      
      if (collectionFilter) {
        q = query(q, where('collection', '==', collectionFilter));
      }
      
      q = query(q, orderBy('timestamp', 'desc'), limit(limitCount));
      
      const querySnapshot = await getDocs(q);
      const logs = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      
      return logs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  // Cleanup old audit logs (retention policy)
  async cleanupOldAuditLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const q = query(
        collection(db, this.collections.AUDIT_LOG),
        where('timestamp', '<', cutoffDate)
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises = [];
      
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      console.log(`Deleted ${deletePromises.length} old audit log entries`);
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
    }
  }

  async clearInventoryCache() {
    const cacheKey = `cached_${this.collections.INVENTORY}`;
    this.clearCachedData(cacheKey);
  }
}

// Create a singleton instance
const firebaseService = new FirebaseService();

export default firebaseService;
