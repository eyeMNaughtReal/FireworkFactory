import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config.js';
import auditService from './auditService.js';

class BackupService {
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

  /**
   * Create a complete backup of all collections
   * @returns {Object} Complete backup data with metadata
   */
  async createFullBackup() {
    try {
      const backup = {
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          createdBy: 'Firework Factory App',
          type: 'full_backup',
          collections: Object.keys(this.collections)
        },
        data: {}
      };

      // Backup each collection
      for (const collectionName of Object.values(this.collections)) {
        console.log(`Backing up ${collectionName}...`);
        const collectionData = await this.backupCollection(collectionName);
        backup.data[collectionName] = collectionData;
      }

      // Store backup metadata in Firebase
      await this.storeBackupMetadata(backup.metadata);

      console.log('Full backup completed successfully');
      return backup;
    } catch (error) {
      console.error('Error creating full backup:', error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Backup a specific collection
   * @param {string} collectionName - Name of the collection to backup
   * @returns {Array} Array of documents from the collection
   */
  async backupCollection(collectionName) {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = [];
      
      querySnapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data(),
          _backup_timestamp: new Date().toISOString()
        });
      });

      return data;
    } catch (error) {
      console.error(`Error backing up collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Store backup metadata in Firebase
   * @param {Object} metadata - Backup metadata
   */
  async storeBackupMetadata(metadata) {
    try {
      const backupId = `backup_${Date.now()}`;
      const backupRef = doc(db, 'backups', backupId);
      await setDoc(backupRef, metadata);
      
      // Log the backup creation to audit trail
      await auditService.logCreate('backups', backupId, metadata, {
        action: 'backup_created',
        description: `Full backup created with ${metadata.collections?.length || 0} collections`,
        collectionsBackedUp: metadata.collections,
        timestamp: metadata.createdAt
      });
      
      console.log(`Backup metadata stored with ID: ${backupId}`);
      return backupId;
    } catch (error) {
      console.error('Error storing backup metadata:', error);
      throw error;
    }
  }

  /**
   * Get list of available backups
   * @returns {Array} List of backup metadata
   */
  async getBackupHistory() {
    try {
      const querySnapshot = await getDocs(collection(db, 'backups'));
      const backups = [];
      
      querySnapshot.forEach((doc) => {
        backups.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return backups;
    } catch (error) {
      console.error('Error getting backup history:', error);
      throw error;
    }
  }

  /**
   * Delete a backup by ID
   * @param {string} backupId - ID of the backup to delete
   * @returns {Promise<void>}
   */
  async deleteBackup(backupId) {
    try {
      const backupRef = doc(db, 'backups', backupId);
      await deleteDoc(backupRef);
      
      // Log the backup deletion to audit trail
      await auditService.logDelete('backups', backupId, null, {
        action: 'backup_deleted',
        description: `Backup ${backupId} was deleted`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Backup ${backupId} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting backup ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Export backup data as downloadable JSON file
   * @param {Object} backupData - Backup data to export
   * @param {string} filename - Optional filename
   */
  exportBackupAsFile(backupData, filename = null) {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const defaultFilename = `firework-factory-backup-${timestamp}.json`;
      const finalFilename = filename || defaultFilename;

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = finalFilename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL
      URL.revokeObjectURL(link.href);
      
      console.log(`Backup exported as ${finalFilename}`);
      return finalFilename;
    } catch (error) {
      console.error('Error exporting backup:', error);
      throw error;
    }
  }

  /**
   * Restore data from backup
   * @param {Object} backupData - Backup data to restore
   * @param {Array} collectionsToRestore - Specific collections to restore (optional)
   * @param {boolean} replaceExisting - Whether to replace existing data (default: false)
   */
  async restoreFromBackup(backupData, collectionsToRestore = null, replaceExisting = false) {
    try {
      if (!backupData || !backupData.data) {
        throw new Error('Invalid backup data format');
      }

      const collections = collectionsToRestore || Object.keys(backupData.data);
      const batch = writeBatch(db);
      const restoredCollections = [];

      for (const collectionName of collections) {
        if (!backupData.data[collectionName]) {
          console.warn(`Collection ${collectionName} not found in backup data`);
          continue;
        }

        console.log(`Restoring ${collectionName}...`);
        
        // If replacing existing data, clear the collection first
        if (replaceExisting) {
          await this.clearCollection(collectionName);
        }

        const documents = backupData.data[collectionName];
        let restoredCount = 0;

        for (const docData of documents) {
          // eslint-disable-next-line no-unused-vars
          const { id, _backup_timestamp, ...cleanData } = docData;
          
          // Add restoration metadata
          cleanData._restored_at = new Date().toISOString();
          cleanData._restored_from_backup = backupData.metadata?.createdAt || 'unknown';

          const docRef = doc(db, collectionName, id);
          batch.set(docRef, cleanData);
          restoredCount++;
        }

        restoredCollections.push({
          collection: collectionName,
          documentsRestored: restoredCount
        });
      }

      // Commit all changes
      await batch.commit();

      // Log restoration metadata
      await this.logRestoration(backupData.metadata, restoredCollections);

      console.log('Restore completed successfully');
      return restoredCollections;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }

  /**
   * Clear all documents from a collection
   * @param {string} collectionName - Name of collection to clear
   */
  async clearCollection(collectionName) {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);

      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Collection ${collectionName} cleared`);
    } catch (error) {
      console.error(`Error clearing collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Log restoration activity
   * @param {Object} backupMetadata - Original backup metadata
   * @param {Array} restoredCollections - Collections that were restored
   */
  async logRestoration(backupMetadata, restoredCollections) {
    try {
      const totalDocuments = restoredCollections.reduce((sum, col) => sum + col.documentsRestored, 0);
      
      // Log the backup restoration to audit trail using the audit service
      await auditService.logAction({
        action: 'restore',
        collection: 'backups',
        documentId: null,
        data: {
          sourceBackup: backupMetadata,
          restoredCollections: restoredCollections,
          totalDocuments: totalDocuments
        },
        metadata: {
          action: 'backup_restored',
          description: `Data restored from backup: ${totalDocuments} documents across ${restoredCollections.length} collections`,
          restorationDetails: restoredCollections,
          sourceBackupCreatedAt: backupMetadata?.createdAt,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('Restoration logged successfully');
    } catch (error) {
      console.error('Error logging restoration:', error);
      // Don't throw - restoration succeeded even if logging failed
    }
  }

  /**
   * Validate backup data format
   * @param {Object} backupData - Backup data to validate
   * @returns {Object} Validation result
   */
  validateBackupData(backupData) {
    try {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        collections: {},
        metadata: null
      };

      // Check basic structure
      if (!backupData) {
        validation.isValid = false;
        validation.errors.push('Backup data is null or undefined');
        return validation;
      }

      if (!backupData.metadata) {
        validation.isValid = false;
        validation.errors.push('Backup metadata is missing');
      } else {
        validation.metadata = backupData.metadata;
      }

      if (!backupData.data) {
        validation.isValid = false;
        validation.errors.push('Backup data section is missing');
        return validation;
      }

      // Validate each collection
      for (const [collectionName, documents] of Object.entries(backupData.data)) {
        const collectionValidation = {
          exists: true,
          documentCount: 0,
          hasValidDocuments: true,
          errors: []
        };

        if (!Array.isArray(documents)) {
          collectionValidation.hasValidDocuments = false;
          collectionValidation.errors.push('Collection data is not an array');
          validation.isValid = false;
        } else {
          collectionValidation.documentCount = documents.length;
          
          // Check document structure
          documents.forEach((doc, index) => {
            if (!doc.id) {
              collectionValidation.errors.push(`Document at index ${index} missing id`);
              validation.warnings.push(`${collectionName}: Document at index ${index} missing id`);
            }
          });
        }

        validation.collections[collectionName] = collectionValidation;
      }

      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        collections: {},
        metadata: null
      };
    }
  }

  /**
   * Schedule automatic backups (for future implementation)
   * @param {string} frequency - Backup frequency ('daily', 'weekly', 'monthly')
   */
  scheduleAutoBackup(frequency = 'weekly') {
    // This would integrate with a scheduling service in a production environment
    console.log(`Auto backup scheduled for ${frequency} frequency`);
    // Implementation would depend on deployment environment
    // Could use cloud functions, cron jobs, or browser-based scheduling
  }

  /**
   * Get backup statistics
   * @returns {Object} Backup statistics
   */
  async getBackupStatistics() {
    try {
      const backups = await this.getBackupHistory();
      const totalSize = await this.calculateTotalDataSize();
      
      return {
        totalBackups: backups.length,
        latestBackup: backups[0] || null,
        oldestBackup: backups[backups.length - 1] || null,
        estimatedDataSize: totalSize,
        collectionsTracked: Object.keys(this.collections).length
      };
    } catch (error) {
      console.error('Error getting backup statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated size of all data
   * @returns {Object} Size information
   */
  async calculateTotalDataSize() {
    try {
      let totalDocuments = 0;
      const collectionSizes = {};

      for (const collectionName of Object.values(this.collections)) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const count = querySnapshot.size;
        collectionSizes[collectionName] = count;
        totalDocuments += count;
      }

      return {
        totalDocuments,
        collections: collectionSizes,
        estimatedSizeKB: Math.round(totalDocuments * 2) // Rough estimate: 2KB per document
      };
    } catch (error) {
      console.error('Error calculating data size:', error);
      return {
        totalDocuments: 0,
        collections: {},
        estimatedSizeKB: 0
      };
    }
  }
}

export default new BackupService();
