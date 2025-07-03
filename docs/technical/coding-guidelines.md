# Coding Guidelines - v0.1.2

## 🆕 What's New in v0.1.2
- Enhanced guidelines for inventory history timeline components
- Updated audit logging standards with improved date formatting
- New conventions for previous quantity tracking in inventory updates

## Backup Management Conventions
- **Backup Naming**: Use timestamp-based names for backups (e.g., `backup_20250629_143022`).
- **Version Control**: Include version information in backup metadata.
- **Validation**: Implement strict validation for backup data structure.
- **Restore Process**: Follow the principle of atomic operations for restore processes.

## Audit Logging Conventions
- **Event Tracking**: Log all significant data modifications.
- **User Context**: Include user information in audit logs.
- **Timestamp Format**: Use ISO 8601 for all timestamps.
- **Log Levels**: Use appropriate log levels (INFO for normal operations, WARN for potential issues, ERROR for failures).

## Inventory History Timeline Conventions (v0.1.2)
- **Date Formatting**: Use `formatDate()` utility for consistent date display across timeline components.
- **Previous Value Tracking**: Always include previous quantity/state when logging inventory changes.
- **Timeline Rendering**: Filter audit logs to show only relevant actions (create/update, not view).
- **Error Handling**: Gracefully handle missing timestamps or malformed dates with fallback formatting.

## Enhanced Audit Logging (v0.1.2)
- **Firestore Timestamps**: Handle both Firestore timestamp objects and ISO strings.
- **Previous Data**: Include previousData in metadata for meaningful change tracking.
- **Action Filtering**: Distinguish between view actions and actual data modifications.
- **Timeline Display**: Use clean, professional formatting without debug information.

### Backup-Related Variables
- `backupMetadata`: Object containing backup information.
- `restoreOptions`: Configuration for restore operations.
- `validationResult`: Results of backup validation checks.
- `backupVersion`: Version information for the backup.
- `backupTimestamp`: ISO 8601 formatted timestamp.

### Audit Log Variables
- `auditEvent`: Object describing the audited action.
- `userContext`: Information about the user performing the action.
- `changeDetails`: Details of what was changed.
- `previousState`: State before the change.
- `newState`: State after the change.

### Inventory History Variables (v0.1.2)
- `inventoryHistory`: Array of filtered audit logs for specific inventory item.
- `previousQuantity`: Previous quantity value before the change.
- `changeDescription`: Human-readable description of the inventory change.
- `timelineEntry`: Formatted entry for display in the history timeline.
- `filteredLogs`: Audit logs filtered to exclude view-only actions.