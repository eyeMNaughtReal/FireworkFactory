import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  where,
  Timestamp,
  doc,
  updateDoc,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

class NotificationHistoryService {
  constructor() {
    this.collectionName = 'notification_history';
    this.maxNotifications = 500; // Prevent infinite growth
  }

  /**
   * Store a notification in history
   * @param {Object} notificationData - Notification information
   * @param {string} notificationData.type - The type of notification (success, error, warning, info)
   * @param {string} notificationData.message - The notification message
   * @param {Object} notificationData.metadata - Additional metadata
   */
  async storeNotification(notificationData) {
    try {
      const notificationEntry = {
        type: notificationData.type || 'info',
        message: notificationData.message,
        metadata: notificationData.metadata || {},
        timestamp: Timestamp.now(),
        createdAt: new Date().toISOString(),
        read: false,
        source: notificationData.source || 'app'
      };

      const notificationRef = collection(db, this.collectionName);
      const docRef = await addDoc(notificationRef, notificationEntry);
      
      console.log(`Notification stored: ${docRef.id}`);
      
      // Clean up old notifications periodically (run occasionally, not on every store)
      if (Math.random() < 0.05) { // 5% chance to trigger cleanup
        this.cleanupOldNotifications();
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error storing notification:', error);
      // Don't throw error - notification storage shouldn't break the main operation
    }
  }

  /**
   * Get notification history with filtering options
   * @param {Object} filters - Filter options
   * @param {string} filters.type - Filter by notification type
   * @param {boolean} filters.unreadOnly - Only show unread notifications
   * @param {number} filters.limit - Limit number of results (default: 100)
   * @returns {Array} Array of notification entries
   */
  async getNotificationHistory(filters = {}) {
    try {
      let notificationQuery = collection(db, this.collectionName);
      
      // Apply filters
      if (filters.type) {
        notificationQuery = query(notificationQuery, where('type', '==', filters.type));
      }
      
      if (filters.unreadOnly) {
        notificationQuery = query(notificationQuery, where('read', '==', false));
      }
      
      // Always order by timestamp and limit results
      notificationQuery = query(
        notificationQuery, 
        orderBy('timestamp', 'desc'), 
        limit(filters.limit || 100)
      );
      
      const querySnapshot = await getDocs(notificationQuery);
      const notifications = [];
      
      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().createdAt)
        });
      });
      
      return notifications;
    } catch (error) {
      console.error('Error fetching notification history:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   * @returns {Object} Statistics about notifications
   */
  async getNotificationStatistics() {
    try {
      const notifications = await this.getNotificationHistory({ limit: 200 });
      
      const stats = {
        totalNotifications: notifications.length,
        unreadCount: notifications.filter(n => !n.read).length,
        typeCounts: {},
        recentNotifications: notifications.slice(0, 5),
        notificationsByDay: {}
      };
      
      notifications.forEach(notification => {
        // Count by type
        stats.typeCounts[notification.type] = (stats.typeCounts[notification.type] || 0) + 1;
        
        // Notifications by day
        const day = notification.timestamp.toDateString();
        stats.notificationsByDay[day] = (stats.notificationsByDay[day] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error fetching notification statistics:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - ID of the notification to mark as read
   */
  async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const unreadQuery = query(
        collection(db, this.collectionName),
        where('read', '==', false)
      );
      
      const querySnapshot = await getDocs(unreadQuery);
      const batch = writeBatch(db);
      
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          readAt: Timestamp.now()
        });
      });
      
      await batch.commit();
      console.log(`Marked ${querySnapshot.size} notifications as read`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications to prevent unlimited growth
   */
  async cleanupOldNotifications() {
    try {
      const notificationQuery = query(
        collection(db, this.collectionName),
        orderBy('timestamp', 'desc'),
        limit(this.maxNotifications + 50) // Get extra to delete
      );
      
      const querySnapshot = await getDocs(notificationQuery);
      
      if (querySnapshot.size > this.maxNotifications) {
        const notificationsToDelete = querySnapshot.docs.slice(this.maxNotifications);
        
        // Delete old notifications in batches
        const batch = writeBatch(db);
        notificationsToDelete.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`Cleaned up ${notificationsToDelete.length} old notifications`);
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }

  /**
   * Delete all notifications (for testing/cleanup purposes)
   */
  async clearAllNotifications() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      const batch = writeBatch(db);
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted ${querySnapshot.size} notifications`);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const notificationHistoryService = new NotificationHistoryService();
export default notificationHistoryService;
