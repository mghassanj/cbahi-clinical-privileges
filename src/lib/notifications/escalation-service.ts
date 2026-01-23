/**
 * CBAHI Email Notification System - Escalation Service
 *
 * 3-level escalation system for pending approval requests.
 * - Level 1 (24h): Reminder to the approver
 * - Level 2 (48h): Escalation to the approver's manager
 * - Level 3 (72h): Escalation to HR
 */

import {
  EscalationLevel,
  EscalationRecord,
  EscalationThresholds,
  PendingApproval,
  User,
  EscalationInfo,
} from './types';

import { NotificationService, getNotificationService } from './notification-service';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_ESCALATION_THRESHOLDS: EscalationThresholds = {
  reminderHours: 24,  // Level 1: 24 hours
  managerHours: 48,   // Level 2: 48 hours
  hrHours: 72,        // Level 3: 72 hours
};

// ============================================================================
// Escalation Service Class
// ============================================================================

/**
 * Service for managing approval escalations
 */
export class EscalationService {
  private notificationService: NotificationService;
  private thresholds: EscalationThresholds;
  private escalationRecords: Map<string, EscalationRecord[]> = new Map();

  // Callback functions for data access (to be implemented by the application)
  private getPendingApprovals: () => Promise<PendingApproval[]>;
  private getApproverManager: (approverId: string) => Promise<User | null>;
  private getHRContacts: () => Promise<User[]>;
  private saveEscalationRecord: (record: EscalationRecord) => Promise<void>;
  private loadEscalationRecords: (requestId: string) => Promise<EscalationRecord[]>;

  constructor(options: {
    notificationService?: NotificationService;
    thresholds?: EscalationThresholds;
    getPendingApprovals: () => Promise<PendingApproval[]>;
    getApproverManager: (approverId: string) => Promise<User | null>;
    getHRContacts: () => Promise<User[]>;
    saveEscalationRecord: (record: EscalationRecord) => Promise<void>;
    loadEscalationRecords: (requestId: string) => Promise<EscalationRecord[]>;
  }) {
    this.notificationService = options.notificationService || getNotificationService();
    this.thresholds = options.thresholds || DEFAULT_ESCALATION_THRESHOLDS;
    this.getPendingApprovals = options.getPendingApprovals;
    this.getApproverManager = options.getApproverManager;
    this.getHRContacts = options.getHRContacts;
    this.saveEscalationRecord = options.saveEscalationRecord;
    this.loadEscalationRecords = options.loadEscalationRecords;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Calculate the number of hours a request has been pending
   */
  calculateHoursPending(pendingSince: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - pendingSince.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  /**
   * Determine the escalation level based on pending hours
   */
  determineEscalationLevel(hoursPending: number): EscalationLevel {
    if (hoursPending >= this.thresholds.hrHours) {
      return EscalationLevel.HR;
    } else if (hoursPending >= this.thresholds.managerHours) {
      return EscalationLevel.MANAGER;
    } else if (hoursPending >= this.thresholds.reminderHours) {
      return EscalationLevel.REMINDER;
    }
    return EscalationLevel.NONE;
  }

  /**
   * Check if an escalation notification has already been sent for a given level
   */
  private async hasEscalationBeenSent(
    requestId: string,
    approverId: string,
    level: EscalationLevel
  ): Promise<boolean> {
    const records = await this.loadEscalationRecords(requestId);
    return records.some(
      (r) =>
        r.approverId === approverId &&
        r.level === level &&
        !r.resolvedAt
    );
  }

  /**
   * Create an escalation record
   */
  private createEscalationRecord(
    requestId: string,
    approverId: string,
    level: EscalationLevel
  ): EscalationRecord {
    return {
      id: `esc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      requestId,
      approverId,
      level,
      createdAt: new Date(),
      notifiedAt: new Date(),
    };
  }

  /**
   * Count previous reminders for a request/approver combination
   */
  private async countPreviousReminders(
    requestId: string,
    approverId: string
  ): Promise<number> {
    const records = await this.loadEscalationRecords(requestId);
    return records.filter(
      (r) => r.approverId === approverId && r.level === EscalationLevel.REMINDER
    ).length;
  }

  // ============================================================================
  // Escalation Processing
  // ============================================================================

  /**
   * Process a single pending approval and send escalation if needed
   */
  async processEscalation(pending: PendingApproval): Promise<{
    escalated: boolean;
    level: EscalationLevel;
    error?: string;
  }> {
    const hoursPending = this.calculateHoursPending(pending.pendingSince);
    const requiredLevel = this.determineEscalationLevel(hoursPending);

    // No escalation needed
    if (requiredLevel === EscalationLevel.NONE) {
      return { escalated: false, level: EscalationLevel.NONE };
    }

    // Check if this escalation has already been sent
    const alreadySent = await this.hasEscalationBeenSent(
      pending.requestId,
      pending.approverId,
      requiredLevel
    );

    if (alreadySent) {
      return { escalated: false, level: requiredLevel };
    }

    // Determine the recipient based on escalation level
    let recipient: User | null = null;

    switch (requiredLevel) {
      case EscalationLevel.REMINDER:
        // Send to the original approver
        recipient = pending.approver;
        break;

      case EscalationLevel.MANAGER:
        // Send to the approver's manager
        recipient = await this.getApproverManager(pending.approverId);
        if (!recipient) {
          console.warn(
            `[EscalationService] No manager found for approver ${pending.approverId}. Skipping manager escalation.`
          );
          return { escalated: false, level: requiredLevel, error: 'No manager found' };
        }
        break;

      case EscalationLevel.HR:
        // Send to HR contacts
        const hrContacts = await this.getHRContacts();
        if (hrContacts.length === 0) {
          console.warn(
            `[EscalationService] No HR contacts found. Skipping HR escalation.`
          );
          return { escalated: false, level: requiredLevel, error: 'No HR contacts found' };
        }
        // Use the first HR contact as the primary recipient
        recipient = hrContacts[0];
        break;
    }

    if (!recipient) {
      return { escalated: false, level: requiredLevel, error: 'No recipient found' };
    }

    // Build escalation info
    const previousReminders = await this.countPreviousReminders(
      pending.requestId,
      pending.approverId
    );

    const escalationInfo: EscalationInfo = {
      level: requiredLevel,
      originalApprover: pending.approver,
      escalatedTo: recipient,
      hoursPending,
      previousReminders,
      escalatedAt: new Date(),
    };

    // Send the escalation notification
    try {
      const result = await this.notificationService.notifyEscalation(
        requiredLevel,
        pending.request,
        escalationInfo
      );

      if (result.success) {
        // Save the escalation record
        const record = this.createEscalationRecord(
          pending.requestId,
          pending.approverId,
          requiredLevel
        );
        await this.saveEscalationRecord(record);

        console.log(
          `[EscalationService] Escalation (Level ${requiredLevel}) sent for request ${pending.requestId}`
        );

        return { escalated: true, level: requiredLevel };
      } else {
        console.error(
          `[EscalationService] Failed to send escalation for request ${pending.requestId}: ${result.error}`
        );
        return { escalated: false, level: requiredLevel, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[EscalationService] Exception during escalation for request ${pending.requestId}: ${errorMessage}`
      );
      return { escalated: false, level: requiredLevel, error: errorMessage };
    }
  }

  /**
   * Process all pending approvals and send escalations as needed
   */
  async processAllEscalations(): Promise<{
    processed: number;
    escalated: number;
    errors: number;
    details: Array<{
      requestId: string;
      level: EscalationLevel;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = {
      processed: 0,
      escalated: 0,
      errors: 0,
      details: [] as Array<{
        requestId: string;
        level: EscalationLevel;
        success: boolean;
        error?: string;
      }>,
    };

    try {
      const pendingApprovals = await this.getPendingApprovals();
      console.log(
        `[EscalationService] Processing ${pendingApprovals.length} pending approvals`
      );

      for (const pending of pendingApprovals) {
        results.processed++;

        const result = await this.processEscalation(pending);

        if (result.escalated) {
          results.escalated++;
        }

        if (result.error) {
          results.errors++;
        }

        if (result.level !== EscalationLevel.NONE) {
          results.details.push({
            requestId: pending.requestId,
            level: result.level,
            success: result.escalated,
            error: result.error,
          });
        }
      }

      console.log(
        `[EscalationService] Escalation processing complete. ` +
        `Processed: ${results.processed}, Escalated: ${results.escalated}, Errors: ${results.errors}`
      );

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[EscalationService] Critical error during escalation processing: ${errorMessage}`
      );
      throw error;
    }
  }

  // ============================================================================
  // Resolution Methods
  // ============================================================================

  /**
   * Mark an escalation as resolved
   */
  async markResolved(
    requestId: string,
    approverId: string,
    resolution: 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'EXPIRED'
  ): Promise<void> {
    const records = await this.loadEscalationRecords(requestId);

    for (const record of records) {
      if (record.approverId === approverId && !record.resolvedAt) {
        record.resolvedAt = new Date();
        record.resolution = resolution;
        await this.saveEscalationRecord(record);
      }
    }

    console.log(
      `[EscalationService] Marked escalations as resolved for request ${requestId}, approver ${approverId}, resolution: ${resolution}`
    );
  }

  /**
   * Mark all escalations for a request as resolved
   */
  async markAllResolved(
    requestId: string,
    resolution: 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'EXPIRED'
  ): Promise<void> {
    const records = await this.loadEscalationRecords(requestId);

    for (const record of records) {
      if (!record.resolvedAt) {
        record.resolvedAt = new Date();
        record.resolution = resolution;
        await this.saveEscalationRecord(record);
      }
    }

    console.log(
      `[EscalationService] Marked all escalations as resolved for request ${requestId}, resolution: ${resolution}`
    );
  }

  // ============================================================================
  // Reporting Methods
  // ============================================================================

  /**
   * Get escalation statistics for a time period
   */
  async getEscalationStats(
    startDate: Date,
    endDate: Date,
    requestIds?: string[]
  ): Promise<{
    totalEscalations: number;
    byLevel: Record<EscalationLevel, number>;
    resolved: number;
    unresolved: number;
    averageResolutionTimeHours: number;
  }> {
    let allRecords: EscalationRecord[] = [];

    if (requestIds) {
      for (const requestId of requestIds) {
        const records = await this.loadEscalationRecords(requestId);
        allRecords = allRecords.concat(records);
      }
    }

    // Filter by date range
    const filteredRecords = allRecords.filter(
      (r) => r.createdAt >= startDate && r.createdAt <= endDate
    );

    const byLevel: Record<EscalationLevel, number> = {
      [EscalationLevel.NONE]: 0,
      [EscalationLevel.REMINDER]: 0,
      [EscalationLevel.MANAGER]: 0,
      [EscalationLevel.HR]: 0,
    };

    let resolved = 0;
    let totalResolutionTimeMs = 0;

    for (const record of filteredRecords) {
      byLevel[record.level]++;

      if (record.resolvedAt) {
        resolved++;
        totalResolutionTimeMs += record.resolvedAt.getTime() - record.createdAt.getTime();
      }
    }

    const averageResolutionTimeHours =
      resolved > 0
        ? totalResolutionTimeMs / resolved / (1000 * 60 * 60)
        : 0;

    return {
      totalEscalations: filteredRecords.length,
      byLevel,
      resolved,
      unresolved: filteredRecords.length - resolved,
      averageResolutionTimeHours: Math.round(averageResolutionTimeHours * 100) / 100,
    };
  }

  /**
   * Get all unresolved escalations
   */
  async getUnresolvedEscalations(requestIds: string[]): Promise<EscalationRecord[]> {
    const unresolved: EscalationRecord[] = [];

    for (const requestId of requestIds) {
      const records = await this.loadEscalationRecords(requestId);
      unresolved.push(...records.filter((r) => !r.resolvedAt));
    }

    return unresolved;
  }
}

// ============================================================================
// In-Memory Escalation Repository (for testing/development)
// ============================================================================

/**
 * Simple in-memory storage for escalation records (for testing)
 */
export class InMemoryEscalationRepository {
  private records: Map<string, EscalationRecord[]> = new Map();

  async save(record: EscalationRecord): Promise<void> {
    const requestRecords = this.records.get(record.requestId) || [];

    // Update existing or add new
    const existingIndex = requestRecords.findIndex((r) => r.id === record.id);
    if (existingIndex >= 0) {
      requestRecords[existingIndex] = record;
    } else {
      requestRecords.push(record);
    }

    this.records.set(record.requestId, requestRecords);
  }

  async load(requestId: string): Promise<EscalationRecord[]> {
    return this.records.get(requestId) || [];
  }

  async loadAll(): Promise<EscalationRecord[]> {
    const allRecords: EscalationRecord[] = [];
    const recordsArray = Array.from(this.records.values());
    for (const records of recordsArray) {
      allRecords.push(...records);
    }
    return allRecords;
  }

  clear(): void {
    this.records.clear();
  }
}

// ============================================================================
// Scheduled Escalation Runner
// ============================================================================

/**
 * Runs escalation checks on a schedule
 */
export class ScheduledEscalationRunner {
  private escalationService: EscalationService;
  private intervalMs: number;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(escalationService: EscalationService, intervalMinutes: number = 60) {
    this.escalationService = escalationService;
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  /**
   * Start the scheduled runner
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[ScheduledEscalationRunner] Already running');
      return;
    }

    console.log(
      `[ScheduledEscalationRunner] Starting with interval of ${this.intervalMs / 60000} minutes`
    );

    // Run immediately on start
    this.run();

    // Then run on interval
    this.intervalId = setInterval(() => this.run(), this.intervalMs);
    this.isRunning = true;
  }

  /**
   * Stop the scheduled runner
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('[ScheduledEscalationRunner] Stopped');
  }

  /**
   * Run a single escalation check
   */
  private async run(): Promise<void> {
    console.log(`[ScheduledEscalationRunner] Running escalation check at ${new Date().toISOString()}`);

    try {
      const results = await this.escalationService.processAllEscalations();
      console.log(
        `[ScheduledEscalationRunner] Completed. ` +
        `Processed: ${results.processed}, Escalated: ${results.escalated}, Errors: ${results.errors}`
      );
    } catch (error) {
      console.error('[ScheduledEscalationRunner] Error during escalation check:', error);
    }
  }

  /**
   * Check if the runner is active
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an escalation service with in-memory storage (for testing)
 */
export function createTestEscalationService(options: {
  notificationService: NotificationService;
  pendingApprovals: PendingApproval[];
  managers: Map<string, User>;
  hrContacts: User[];
  thresholds?: EscalationThresholds;
}): {
  service: EscalationService;
  repository: InMemoryEscalationRepository;
} {
  const repository = new InMemoryEscalationRepository();

  const service = new EscalationService({
    notificationService: options.notificationService,
    thresholds: options.thresholds,
    getPendingApprovals: async () => options.pendingApprovals,
    getApproverManager: async (approverId) => options.managers.get(approverId) || null,
    getHRContacts: async () => options.hrContacts,
    saveEscalationRecord: async (record) => repository.save(record),
    loadEscalationRecords: async (requestId) => repository.load(requestId),
  });

  return { service, repository };
}

export default {
  EscalationService,
  InMemoryEscalationRepository,
  ScheduledEscalationRunner,
  createTestEscalationService,
  DEFAULT_ESCALATION_THRESHOLDS,
};
