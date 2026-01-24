/**
 * Sync Service for Jisr HR Data
 *
 * Provides synchronization between Jisr HR system and local database.
 * Handles employees, departments, and locations with proper relationship mapping.
 */

import {
  JisrClient,
  JisrEmployee,
  JisrDepartment,
  JisrLocation,
  createJisrClientFromEnv,
} from './jisr';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface SyncResult {
  success: boolean;
  entity: string;
  created: number;
  updated: number;
  skipped: number;
  errors: SyncError[];
  duration: number;
  timestamp: Date;
}

export interface FullSyncResult {
  success: boolean;
  results: {
    departments?: SyncResult;
    locations?: SyncResult;
    employees?: SyncResult;
  };
  totalDuration: number;
  timestamp: Date;
}

export interface SyncError {
  jisrId: number | string;
  message: string;
  field?: string;
  data?: unknown;
}

export interface SyncOptions {
  batchSize?: number;
  skipInactive?: boolean;
  dryRun?: boolean;
  onProgress?: (progress: SyncProgress) => void;
}

export interface SyncProgress {
  entity: string;
  current: number;
  total: number;
  phase: 'fetching' | 'processing' | 'saving';
}

// Local model interfaces (to be implemented based on your database schema)
export interface LocalUser {
  id?: string | number;
  jisr_id: number;
  employee_number: string;
  first_name: string;
  first_name_ar?: string;
  last_name: string;
  last_name_ar?: string;
  full_name: string;
  full_name_ar?: string;
  email: string;
  work_email?: string;
  phone?: string;
  mobile?: string;
  gender?: string;
  birth_date?: Date | null;
  hire_date?: Date | null;
  employment_status?: string;
  employment_type?: string;
  avatar_url?: string;
  department_id?: string | number | null;
  job_title?: string;
  job_title_ar?: string;
  location_id?: string | number | null;
  line_manager_id?: string | number | null;
  nationality?: string;
  // Document information
  document_number?: string | null;
  document_type?: string | null;
  national_id_number?: string | null;
  iqama_number?: string | null;
  passport_number?: string | null;
  // Photo URL
  photo_url?: string | null;
  // Branch information
  branch_id?: number | null;
  branch_name?: string | null;
  branch_name_ar?: string | null;
  is_active: boolean;
  synced_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface LocalDepartment {
  id?: string | number;
  jisr_id: number;
  name: string;
  name_ar?: string;
  code?: string;
  parent_id?: string | number | null;
  manager_id?: string | number | null;
  employees_count?: number;
  is_active: boolean;
  synced_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface LocalLocation {
  id?: string | number;
  jisr_id: number;
  name: string;
  name_ar?: string;
  address?: string;
  area_name?: string;
  country_name?: string;
  is_active: boolean;
  synced_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface SyncMetadata {
  id?: string | number;
  entity_type: string;
  last_sync_at: Date;
  last_sync_status: 'success' | 'partial' | 'failed';
  records_synced: number;
  error_count: number;
  created_at?: Date;
  updated_at?: Date;
}

// Database adapter interface - implement based on your ORM/database
export interface DatabaseAdapter {
  // User operations
  findUserByJisrId(jisrId: number): Promise<LocalUser | null>;
  findUsersByJisrIds(jisrIds: number[]): Promise<Map<number, LocalUser>>;
  upsertUser(user: LocalUser): Promise<LocalUser>;
  upsertUsers(users: LocalUser[]): Promise<LocalUser[]>;

  // Department operations
  findDepartmentByJisrId(jisrId: number): Promise<LocalDepartment | null>;
  findDepartmentsByJisrIds(jisrIds: number[]): Promise<Map<number, LocalDepartment>>;
  upsertDepartment(department: LocalDepartment): Promise<LocalDepartment>;
  upsertDepartments(departments: LocalDepartment[]): Promise<LocalDepartment[]>;

  // Location operations
  findLocationByJisrId(jisrId: number): Promise<LocalLocation | null>;
  findLocationsByJisrIds(jisrIds: number[]): Promise<Map<number, LocalLocation>>;
  upsertLocation(location: LocalLocation): Promise<LocalLocation>;
  upsertLocations(locations: LocalLocation[]): Promise<LocalLocation[]>;

  // Sync metadata operations
  getSyncMetadata(entityType: string): Promise<SyncMetadata | null>;
  upsertSyncMetadata(metadata: SyncMetadata): Promise<SyncMetadata>;

  // Transaction support (optional)
  beginTransaction?(): Promise<void>;
  commitTransaction?(): Promise<void>;
  rollbackTransaction?(): Promise<void>;
}

// =============================================================================
// Sync Service Class
// =============================================================================

export class SyncService {
  private readonly jisrClient: JisrClient;
  private readonly db: DatabaseAdapter;
  private readonly defaultBatchSize: number = 50;

  constructor(jisrClient: JisrClient, databaseAdapter: DatabaseAdapter) {
    this.jisrClient = jisrClient;
    this.db = databaseAdapter;
  }

  // ===========================================================================
  // Public Sync Methods
  // ===========================================================================

  /**
   * Sync all employees from Jisr to local database
   */
  public async syncEmployees(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    try {
      options.onProgress?.({
        entity: 'employees',
        current: 0,
        total: 0,
        phase: 'fetching',
      });

      // Fetch all employees from Jisr
      const jisrEmployees = await this.jisrClient.getEmployees();

      options.onProgress?.({
        entity: 'employees',
        current: 0,
        total: jisrEmployees.length,
        phase: 'processing',
      });

      // Get existing employees by Jisr IDs for efficient lookup
      const jisrIds = jisrEmployees.map((e) => e.id);
      const existingUsers = await this.db.findUsersByJisrIds(jisrIds);

      // Get all departments and locations for relationship mapping
      const departments = await this.db.findDepartmentsByJisrIds(
        jisrEmployees.filter((e) => e.department_id).map((e) => e.department_id!)
      );
      const locations = await this.db.findLocationsByJisrIds(
        jisrEmployees.filter((e) => e.location_id).map((e) => e.location_id!)
      );

      // Process in batches
      const batchSize = options.batchSize || this.defaultBatchSize;
      const batches = this.chunkArray(jisrEmployees, batchSize);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const usersToUpsert: LocalUser[] = [];

        for (const jisrEmployee of batch) {
          try {
            // Skip inactive if configured
            if (options.skipInactive && !jisrEmployee.is_active) {
              skipped++;
              continue;
            }

            const existingUser = existingUsers.get(jisrEmployee.id);
            const localUser = this.mapEmployeeToUser(jisrEmployee, {
              existingUser,
              departments,
              locations,
            });

            if (!options.dryRun) {
              usersToUpsert.push(localUser);
            }

            if (existingUser) {
              updated++;
            } else {
              created++;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push({
              jisrId: jisrEmployee.id,
              message: `Failed to process employee: ${errorMessage}`,
              data: { employee_number: jisrEmployee.employee_number },
            });
          }
        }

        if (!options.dryRun && usersToUpsert.length > 0) {
          await this.db.upsertUsers(usersToUpsert);
        }

        options.onProgress?.({
          entity: 'employees',
          current: (batchIndex + 1) * batchSize,
          total: jisrEmployees.length,
          phase: 'saving',
        });
      }

      // Handle line manager relationships in a second pass
      if (!options.dryRun) {
        await this.updateLineManagerRelationships(jisrEmployees);
      }

      // Update sync metadata
      if (!options.dryRun) {
        await this.db.upsertSyncMetadata({
          entity_type: 'employees',
          last_sync_at: new Date(),
          last_sync_status: errors.length === 0 ? 'success' : 'partial',
          records_synced: created + updated,
          error_count: errors.length,
        });
      }

      return {
        success: errors.length === 0,
        entity: 'employees',
        created,
        updated,
        skipped,
        errors,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        entity: 'employees',
        created,
        updated,
        skipped,
        errors: [...errors, { jisrId: 'N/A', message: `Sync failed: ${errorMessage}` }],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Sync all departments from Jisr to local database
   */
  public async syncDepartments(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    try {
      options.onProgress?.({
        entity: 'departments',
        current: 0,
        total: 0,
        phase: 'fetching',
      });

      // Fetch all departments from Jisr
      const jisrDepartments = await this.jisrClient.getDepartments();

      // Flatten nested departments if they have children
      const flattenedDepartments = this.flattenDepartments(jisrDepartments);

      options.onProgress?.({
        entity: 'departments',
        current: 0,
        total: flattenedDepartments.length,
        phase: 'processing',
      });

      // Get existing departments by Jisr IDs
      const jisrIds = flattenedDepartments.map((d) => d.id);
      const existingDepartments = await this.db.findDepartmentsByJisrIds(jisrIds);

      // First pass: Create/update all departments without parent relationships
      const departmentsToUpsert: LocalDepartment[] = [];

      for (const jisrDepartment of flattenedDepartments) {
        try {
          if (options.skipInactive && jisrDepartment.is_active === false) {
            skipped++;
            continue;
          }

          const existingDepartment = existingDepartments.get(jisrDepartment.id);
          const localDepartment = this.mapJisrDepartmentToLocal(jisrDepartment, existingDepartment);

          // Set parent_id to null initially - will be updated in second pass
          localDepartment.parent_id = null;

          if (!options.dryRun) {
            departmentsToUpsert.push(localDepartment);
          }

          if (existingDepartment) {
            updated++;
          } else {
            created++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            jisrId: jisrDepartment.id,
            message: `Failed to process department: ${errorMessage}`,
            data: { name: jisrDepartment.name },
          });
        }
      }

      if (!options.dryRun && departmentsToUpsert.length > 0) {
        await this.db.upsertDepartments(departmentsToUpsert);
      }

      // Second pass: Update parent relationships
      if (!options.dryRun) {
        await this.updateDepartmentHierarchy(flattenedDepartments);
      }

      // Third pass: Update manager relationships
      if (!options.dryRun) {
        await this.updateDepartmentManagers(flattenedDepartments);
      }

      options.onProgress?.({
        entity: 'departments',
        current: flattenedDepartments.length,
        total: flattenedDepartments.length,
        phase: 'saving',
      });

      // Update sync metadata
      if (!options.dryRun) {
        await this.db.upsertSyncMetadata({
          entity_type: 'departments',
          last_sync_at: new Date(),
          last_sync_status: errors.length === 0 ? 'success' : 'partial',
          records_synced: created + updated,
          error_count: errors.length,
        });
      }

      return {
        success: errors.length === 0,
        entity: 'departments',
        created,
        updated,
        skipped,
        errors,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        entity: 'departments',
        created,
        updated,
        skipped,
        errors: [...errors, { jisrId: 'N/A', message: `Sync failed: ${errorMessage}` }],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Sync all locations from Jisr to local database
   */
  public async syncLocations(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    try {
      options.onProgress?.({
        entity: 'locations',
        current: 0,
        total: 0,
        phase: 'fetching',
      });

      // Fetch all locations from Jisr (already flattened by the client)
      const jisrLocations = await this.jisrClient.getLocations();

      options.onProgress?.({
        entity: 'locations',
        current: 0,
        total: jisrLocations.length,
        phase: 'processing',
      });

      // Get existing locations by Jisr IDs
      const jisrIds = jisrLocations.map((l) => l.id);
      const existingLocations = await this.db.findLocationsByJisrIds(jisrIds);

      const locationsToUpsert: LocalLocation[] = [];

      for (const jisrLocation of jisrLocations) {
        try {
          if (options.skipInactive && jisrLocation.is_active === false) {
            skipped++;
            continue;
          }

          const existingLocation = existingLocations.get(jisrLocation.id);
          const localLocation = this.mapJisrLocationToLocal(jisrLocation, existingLocation);

          if (!options.dryRun) {
            locationsToUpsert.push(localLocation);
          }

          if (existingLocation) {
            updated++;
          } else {
            created++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            jisrId: jisrLocation.id,
            message: `Failed to process location: ${errorMessage}`,
            data: { name: jisrLocation.name },
          });
        }
      }

      if (!options.dryRun && locationsToUpsert.length > 0) {
        await this.db.upsertLocations(locationsToUpsert);
      }

      options.onProgress?.({
        entity: 'locations',
        current: jisrLocations.length,
        total: jisrLocations.length,
        phase: 'saving',
      });

      // Update sync metadata
      if (!options.dryRun) {
        await this.db.upsertSyncMetadata({
          entity_type: 'locations',
          last_sync_at: new Date(),
          last_sync_status: errors.length === 0 ? 'success' : 'partial',
          records_synced: created + updated,
          error_count: errors.length,
        });
      }

      return {
        success: errors.length === 0,
        entity: 'locations',
        created,
        updated,
        skipped,
        errors,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        entity: 'locations',
        created,
        updated,
        skipped,
        errors: [...errors, { jisrId: 'N/A', message: `Sync failed: ${errorMessage}` }],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Run a full sync of all entities in the correct order
   * Order: Departments -> Locations -> Employees (to ensure relationships exist)
   */
  public async syncAll(options: SyncOptions = {}): Promise<FullSyncResult> {
    const startTime = Date.now();
    const results: FullSyncResult['results'] = {};

    try {
      // Start transaction if supported
      if (this.db.beginTransaction) {
        await this.db.beginTransaction();
      }

      // Sync in order of dependencies
      results.departments = await this.syncDepartments(options);
      results.locations = await this.syncLocations(options);
      results.employees = await this.syncEmployees(options);

      // Commit transaction if supported
      if (this.db.commitTransaction) {
        await this.db.commitTransaction();
      }

      const allSuccess = Object.values(results).every((r) => r?.success);

      return {
        success: allSuccess,
        results,
        totalDuration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch {
      // Rollback transaction if supported
      if (this.db.rollbackTransaction) {
        await this.db.rollbackTransaction();
      }

      return {
        success: false,
        results,
        totalDuration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get the last sync time for an entity
   */
  public async getLastSyncTime(entityType?: string): Promise<Date | null> {
    if (entityType) {
      const metadata = await this.db.getSyncMetadata(entityType);
      return metadata?.last_sync_at || null;
    }

    // Get the most recent sync time across all entities
    const entities = ['employees', 'departments', 'locations'];
    let latestSync: Date | null = null;

    for (const entity of entities) {
      const metadata = await this.db.getSyncMetadata(entity);
      if (metadata?.last_sync_at) {
        if (!latestSync || metadata.last_sync_at > latestSync) {
          latestSync = metadata.last_sync_at;
        }
      }
    }

    return latestSync;
  }

  /**
   * Get sync status for all entities
   */
  public async getSyncStatus(): Promise<Record<string, SyncMetadata | null>> {
    const entities = ['employees', 'departments', 'locations'];
    const status: Record<string, SyncMetadata | null> = {};

    for (const entity of entities) {
      status[entity] = await this.db.getSyncMetadata(entity);
    }

    return status;
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Map Jisr employee to local user model
   */
  private mapEmployeeToUser(
    jisrEmployee: JisrEmployee,
    context: {
      existingUser?: LocalUser | null;
      departments?: Map<number, LocalDepartment>;
      locations?: Map<number, LocalLocation>;
    }
  ): LocalUser {
    const { existingUser, departments, locations } = context;

    // Look up local department and location IDs
    let departmentId: string | number | null = null;
    if (jisrEmployee.department_id && departments) {
      const localDept = departments.get(jisrEmployee.department_id);
      departmentId = localDept?.id || null;
    }

    let locationId: string | number | null = null;
    if (jisrEmployee.location_id && locations) {
      const localLoc = locations.get(jisrEmployee.location_id);
      locationId = localLoc?.id || null;
    }

    // Handle employment_type which can be string or object
    const employmentType = typeof jisrEmployee.employment_type === 'object'
      ? jisrEmployee.employment_type?.name
      : jisrEmployee.employment_type;

    // Extract document information
    const nationalIdNumber = jisrEmployee.identification_info?.national_id || null;
    const iqamaNumber = jisrEmployee.identification_info?.iqama_number || null;
    const passportNumber = jisrEmployee.identification_info?.passport_number || null;
    const documentNumber = nationalIdNumber || iqamaNumber || passportNumber || null;
    const documentType = nationalIdNumber ? 'national_id' : (iqamaNumber ? 'iqama' : (passportNumber ? 'passport' : null));

    return {
      id: existingUser?.id,
      jisr_id: jisrEmployee.id,
      employee_number: jisrEmployee.employee_number || jisrEmployee.code || '',
      first_name: jisrEmployee.first_name || '',
      first_name_ar: jisrEmployee.first_name_ar,
      last_name: jisrEmployee.last_name || '',
      last_name_ar: jisrEmployee.last_name_ar,
      full_name: jisrEmployee.full_name || jisrEmployee.full_name_i18n || jisrEmployee.name || '',
      full_name_ar: jisrEmployee.full_name_ar,
      email: jisrEmployee.email,
      work_email: jisrEmployee.work_email,
      phone: jisrEmployee.phone || jisrEmployee.telephone,
      mobile: jisrEmployee.mobile,
      gender: jisrEmployee.gender,
      birth_date: jisrEmployee.birth_date ? new Date(jisrEmployee.birth_date) : null,
      hire_date: jisrEmployee.joining_date || jisrEmployee.hire_date ? new Date(jisrEmployee.joining_date || jisrEmployee.hire_date!) : null,
      employment_status: jisrEmployee.employment_status || jisrEmployee.status,
      employment_type: employmentType,
      avatar_url: jisrEmployee.avatar_url || jisrEmployee.avatar_thumb,
      department_id: departmentId,
      job_title: jisrEmployee.job_title_name || jisrEmployee.job_title?.name_i18n || jisrEmployee.job_title?.name,
      location_id: locationId,
      line_manager_id: null, // Will be set in second pass
      nationality: jisrEmployee.nationality_name || jisrEmployee.identification_info?.nationality_i18n || jisrEmployee.identification_info?.nationality,
      // Document information
      document_number: documentNumber,
      document_type: documentType,
      national_id_number: nationalIdNumber,
      iqama_number: iqamaNumber,
      passport_number: passportNumber,
      // Photo URL
      photo_url: jisrEmployee.avatar_url || jisrEmployee.avatar_thumb || null,
      // Branch information
      branch_id: jisrEmployee.branch_id || jisrEmployee.branch?.id || null,
      branch_name: jisrEmployee.branch_name || jisrEmployee.branch?.name_i18n || jisrEmployee.branch?.name || null,
      branch_name_ar: jisrEmployee.branch?.name_ar || null,
      is_active: jisrEmployee.is_active ?? (jisrEmployee.status !== 'inactive'),
      synced_at: new Date(),
      created_at: existingUser?.created_at,
      updated_at: new Date(),
    };
  }

  /**
   * Map Jisr department to local department model
   */
  private mapJisrDepartmentToLocal(
    jisrDepartment: JisrDepartment,
    existingDepartment?: LocalDepartment | null
  ): LocalDepartment {
    return {
      id: existingDepartment?.id,
      jisr_id: jisrDepartment.id,
      name: jisrDepartment.name,
      name_ar: jisrDepartment.name_ar,
      code: jisrDepartment.code,
      parent_id: null, // Will be set in second pass
      manager_id: null, // Will be set in third pass
      employees_count: jisrDepartment.employees_count,
      is_active: jisrDepartment.is_active ?? true,
      synced_at: new Date(),
      created_at: existingDepartment?.created_at,
      updated_at: new Date(),
    };
  }

  /**
   * Map Jisr location to local location model
   */
  private mapJisrLocationToLocal(
    jisrLocation: JisrLocation,
    existingLocation?: LocalLocation | null
  ): LocalLocation {
    return {
      id: existingLocation?.id,
      jisr_id: jisrLocation.id,
      name: jisrLocation.name,
      name_ar: jisrLocation.name_ar,
      address: jisrLocation.address,
      area_name: jisrLocation.area_name,
      country_name: jisrLocation.country_name,
      is_active: jisrLocation.is_active ?? true,
      synced_at: new Date(),
      created_at: existingLocation?.created_at,
      updated_at: new Date(),
    };
  }

  /**
   * Flatten nested department hierarchy into a flat array
   */
  private flattenDepartments(departments: JisrDepartment[]): JisrDepartment[] {
    const result: JisrDepartment[] = [];

    const flatten = (depts: JisrDepartment[]) => {
      for (const dept of depts) {
        result.push(dept);
        if (dept.children && dept.children.length > 0) {
          flatten(dept.children);
        }
      }
    };

    flatten(departments);
    return result;
  }

  /**
   * Update department parent relationships after initial sync
   */
  private async updateDepartmentHierarchy(jisrDepartments: JisrDepartment[]): Promise<void> {
    // Build a map of Jisr ID to local department
    const jisrIds = jisrDepartments.map((d) => d.id);
    const localDepartments = await this.db.findDepartmentsByJisrIds(jisrIds);

    const updates: LocalDepartment[] = [];

    for (const jisrDept of jisrDepartments) {
      if (jisrDept.parent_id) {
        const localDept = localDepartments.get(jisrDept.id);
        const parentDept = localDepartments.get(jisrDept.parent_id);

        if (localDept && parentDept) {
          localDept.parent_id = parentDept.id;
          updates.push(localDept);
        }
      }
    }

    if (updates.length > 0) {
      await this.db.upsertDepartments(updates);
    }
  }

  /**
   * Update department manager relationships after sync
   */
  private async updateDepartmentManagers(jisrDepartments: JisrDepartment[]): Promise<void> {
    const managerIds = jisrDepartments
      .filter((d) => d.manager_id)
      .map((d) => d.manager_id!);

    if (managerIds.length === 0) return;

    const managers = await this.db.findUsersByJisrIds(managerIds);
    const jisrIds = jisrDepartments.map((d) => d.id);
    const localDepartments = await this.db.findDepartmentsByJisrIds(jisrIds);

    const updates: LocalDepartment[] = [];

    for (const jisrDept of jisrDepartments) {
      if (jisrDept.manager_id) {
        const localDept = localDepartments.get(jisrDept.id);
        const manager = managers.get(jisrDept.manager_id);

        if (localDept && manager) {
          localDept.manager_id = manager.id;
          updates.push(localDept);
        }
      }
    }

    if (updates.length > 0) {
      await this.db.upsertDepartments(updates);
    }
  }

  /**
   * Update employee line manager relationships after initial sync
   */
  private async updateLineManagerRelationships(jisrEmployees: JisrEmployee[]): Promise<void> {
    const managerIds = jisrEmployees
      .filter((e) => e.line_manager_id)
      .map((e) => e.line_manager_id!);

    if (managerIds.length === 0) return;

    // Get all employees (both managers and their reports)
    const allJisrIds = Array.from(new Set([...jisrEmployees.map((e) => e.id), ...managerIds]));
    const localUsers = await this.db.findUsersByJisrIds(allJisrIds);

    const updates: LocalUser[] = [];

    for (const jisrEmployee of jisrEmployees) {
      if (jisrEmployee.line_manager_id) {
        const localUser = localUsers.get(jisrEmployee.id);
        const manager = localUsers.get(jisrEmployee.line_manager_id);

        if (localUser && manager) {
          localUser.line_manager_id = manager.id;
          updates.push(localUser);
        }
      }
    }

    if (updates.length > 0) {
      await this.db.upsertUsers(updates);
    }
  }

  /**
   * Split an array into chunks of specified size
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a SyncService from environment variables
 */
export function createSyncServiceFromEnv(databaseAdapter: DatabaseAdapter): SyncService {
  const jisrClient = createJisrClientFromEnv();
  return new SyncService(jisrClient, databaseAdapter);
}

// =============================================================================
// Example In-Memory Database Adapter (for testing)
// =============================================================================

export class InMemoryDatabaseAdapter implements DatabaseAdapter {
  private users: Map<number, LocalUser> = new Map();
  private departments: Map<number, LocalDepartment> = new Map();
  private locations: Map<number, LocalLocation> = new Map();
  private syncMetadata: Map<string, SyncMetadata> = new Map();
  private autoIncrementId = 1;

  async findUserByJisrId(jisrId: number): Promise<LocalUser | null> {
    return this.users.get(jisrId) || null;
  }

  async findUsersByJisrIds(jisrIds: number[]): Promise<Map<number, LocalUser>> {
    const result = new Map<number, LocalUser>();
    for (const id of jisrIds) {
      const user = this.users.get(id);
      if (user) result.set(id, user);
    }
    return result;
  }

  async upsertUser(user: LocalUser): Promise<LocalUser> {
    if (!user.id) {
      user.id = this.autoIncrementId++;
      user.created_at = new Date();
    }
    user.updated_at = new Date();
    this.users.set(user.jisr_id, user);
    return user;
  }

  async upsertUsers(users: LocalUser[]): Promise<LocalUser[]> {
    return Promise.all(users.map((u) => this.upsertUser(u)));
  }

  async findDepartmentByJisrId(jisrId: number): Promise<LocalDepartment | null> {
    return this.departments.get(jisrId) || null;
  }

  async findDepartmentsByJisrIds(jisrIds: number[]): Promise<Map<number, LocalDepartment>> {
    const result = new Map<number, LocalDepartment>();
    for (const id of jisrIds) {
      const dept = this.departments.get(id);
      if (dept) result.set(id, dept);
    }
    return result;
  }

  async upsertDepartment(department: LocalDepartment): Promise<LocalDepartment> {
    if (!department.id) {
      department.id = this.autoIncrementId++;
      department.created_at = new Date();
    }
    department.updated_at = new Date();
    this.departments.set(department.jisr_id, department);
    return department;
  }

  async upsertDepartments(departments: LocalDepartment[]): Promise<LocalDepartment[]> {
    return Promise.all(departments.map((d) => this.upsertDepartment(d)));
  }

  async findLocationByJisrId(jisrId: number): Promise<LocalLocation | null> {
    return this.locations.get(jisrId) || null;
  }

  async findLocationsByJisrIds(jisrIds: number[]): Promise<Map<number, LocalLocation>> {
    const result = new Map<number, LocalLocation>();
    for (const id of jisrIds) {
      const loc = this.locations.get(id);
      if (loc) result.set(id, loc);
    }
    return result;
  }

  async upsertLocation(location: LocalLocation): Promise<LocalLocation> {
    if (!location.id) {
      location.id = this.autoIncrementId++;
      location.created_at = new Date();
    }
    location.updated_at = new Date();
    this.locations.set(location.jisr_id, location);
    return location;
  }

  async upsertLocations(locations: LocalLocation[]): Promise<LocalLocation[]> {
    return Promise.all(locations.map((l) => this.upsertLocation(l)));
  }

  async getSyncMetadata(entityType: string): Promise<SyncMetadata | null> {
    return this.syncMetadata.get(entityType) || null;
  }

  async upsertSyncMetadata(metadata: SyncMetadata): Promise<SyncMetadata> {
    if (!metadata.id) {
      metadata.id = this.autoIncrementId++;
      metadata.created_at = new Date();
    }
    metadata.updated_at = new Date();
    this.syncMetadata.set(metadata.entity_type, metadata);
    return metadata;
  }

  // Helper methods for testing
  getAllUsers(): LocalUser[] {
    return Array.from(this.users.values());
  }

  getAllDepartments(): LocalDepartment[] {
    return Array.from(this.departments.values());
  }

  getAllLocations(): LocalLocation[] {
    return Array.from(this.locations.values());
  }

  clear(): void {
    this.users.clear();
    this.departments.clear();
    this.locations.clear();
    this.syncMetadata.clear();
    this.autoIncrementId = 1;
  }
}

export default SyncService;
