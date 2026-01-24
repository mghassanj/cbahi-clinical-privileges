/**
 * Jisr HR API Client
 *
 * A TypeScript client for integrating with the Jisr HR management system API.
 * Provides methods to fetch employees, departments, locations, job titles, and nationalities.
 *
 * @see https://api.jisr.net/v2
 */

// =============================================================================
// Types & Interfaces
// =============================================================================

export type JisrLocale = 'en' | 'ar';

// Base response wrapper from Jisr API
export interface JisrApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface JisrPaginatedResponse<T> {
  data: {
    data: T[];
    pagination?: {
      current_page: number;
      per_page: number;
      total_pages: number;
      total_count: number;
    };
  };
}

// Employee Types
export interface JisrEmployee {
  id: number;
  employee_number: string;
  full_name: string;
  full_name_ar?: string;
  first_name: string;
  first_name_ar?: string;
  last_name: string;
  last_name_ar?: string;
  email: string;
  work_email?: string;
  phone?: string;
  mobile?: string;
  gender?: 'male' | 'female';
  birth_date?: string;
  hire_date?: string;
  employment_status?: string;
  employment_type?: string;
  avatar_url?: string;
  avatar_thumb_url?: string;
  department_id?: number;
  department_name?: string;
  job_title_id?: number;
  job_title_name?: string;
  location_id?: number;
  location_name?: string;
  line_manager_id?: number;
  line_manager_name?: string;
  nationality_id?: number;
  nationality_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface JisrEmployeeDetail extends JisrEmployee {
  // Personal Information
  marital_status?: string;
  national_id?: string;
  passport_number?: string;
  passport_expiry_date?: string;
  iqama_number?: string;
  iqama_expiry_date?: string;

  // Address Information
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;

  // Organization Information
  branch_id?: number;
  branch_name?: string;
  grade_id?: number;
  grade_name?: string;
  cost_center_id?: number;
  cost_center_name?: string;

  // Employment Information
  probation_end_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  termination_date?: string;
  termination_reason?: string;

  // Bank Information
  bank_name?: string;
  bank_account_number?: string;
  iban?: string;

  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;

  // Custom Fields
  custom_fields?: Record<string, unknown>;
}

// Department Types
export interface JisrDepartment {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  parent_id?: number | null;
  parent_name?: string;
  manager_id?: number;
  manager_name?: string;
  employees_count?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  children?: JisrDepartment[];
}

// Location Types (nested structure: countries > areas > locations)
export interface JisrCountry {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  areas?: JisrArea[];
}

export interface JisrArea {
  id: number;
  name: string;
  name_ar?: string;
  country_id: number;
  locations?: JisrLocationItem[];
}

export interface JisrLocationItem {
  id: number;
  name: string;
  name_ar?: string;
  area_id: number;
  address?: string;
  is_active?: boolean;
}

// Flattened location for easier consumption
export interface JisrLocation {
  id: number;
  name: string;
  name_ar?: string;
  address?: string;
  area_id: number;
  area_name?: string;
  country_id: number;
  country_name?: string;
  is_active?: boolean;
}

// Job Title Types
export interface JisrJobTitleCategory {
  id: number;
  name: string;
  name_ar?: string;
  job_titles?: JisrJobTitleItem[];
}

export interface JisrJobTitleItem {
  id: number;
  name: string;
  name_ar?: string;
  category_id?: number;
  category_name?: string;
  is_active?: boolean;
}

export interface JisrJobTitle {
  id: number;
  name: string;
  name_ar?: string;
  category_id?: number;
  category_name?: string;
  is_active?: boolean;
}

// Nationality Types
export interface JisrNationality {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  country_code?: string;
}

// Error Types
export interface JisrApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

// =============================================================================
// Jisr Client Class
// =============================================================================

export class JisrClientError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, status?: number, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'JisrClientError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export interface JisrClientConfig {
  accessToken: string;
  companySlug: string;
  baseUrl?: string;
  locale?: JisrLocale;
  timeout?: number;
}

export class JisrClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly companySlug: string;
  private locale: JisrLocale;
  private readonly timeout: number;

  constructor(config: JisrClientConfig) {
    this.baseUrl = config.baseUrl || 'https://api.jisr.net/v2';
    this.accessToken = config.accessToken;
    this.companySlug = config.companySlug;
    this.locale = config.locale || 'en';
    this.timeout = config.timeout || 30000;

    if (!this.accessToken) {
      throw new JisrClientError('Access token is required');
    }
    if (!this.companySlug) {
      throw new JisrClientError('Company slug is required');
    }
  }

  /**
   * Set the locale for API responses
   */
  public setLocale(locale: JisrLocale): void {
    this.locale = locale;
  }

  /**
   * Get the current locale
   */
  public getLocale(): JisrLocale {
    return this.locale;
  }

  /**
   * Build headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Cookie': `access_token=${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'locale': this.locale,
      'slug': this.companySlug,
    };
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Always include slug as query param
    url.searchParams.append('slug', this.companySlug);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Make an HTTP request to the Jisr API
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      params?: Record<string, string | number | boolean>;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const { method = 'GET', params, body } = options;
    const url = this.buildUrl(endpoint, params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: JisrApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new JisrClientError(
          errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData.code,
          errorData.errors
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof JisrClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new JisrClientError(`Request timed out after ${this.timeout}ms`);
        }
        throw new JisrClientError(`Network error: ${error.message}`);
      }

      throw new JisrClientError('An unknown error occurred');
    }
  }

  // ===========================================================================
  // Employee Methods
  // ===========================================================================

  /**
   * Get all employees
   * Uses /employees endpoint which includes email addresses
   * @returns Promise<JisrEmployee[]>
   */
  public async getEmployees(): Promise<JisrEmployee[]> {
    // Use /employees endpoint instead of /employees/get_all as it includes email addresses
    const response = await this.request<{ data: { employees: JisrEmployee[] } }>(
      '/employees'
    );

    // Handle nested response format: { data: { employees: [...] } }
    if (response?.data?.employees && Array.isArray(response.data.employees)) {
      return response.data.employees.map(emp => {
        // Cast to access i18n properties that may come from API but aren't in our interface
        const rawEmp = emp as JisrEmployee & { name_i18n?: string; job_title_i18n?: string; name?: string; code?: string };
        return {
          ...emp,
          full_name: rawEmp.name_i18n || emp.full_name || rawEmp.name || '',
          job_title_name: rawEmp.job_title_i18n || emp.job_title_name,
          employee_number: rawEmp.code || emp.employee_number,
        };
      });
    }

    return [];
  }

  /**
   * Get employee by ID with detailed information
   * @param id - Employee ID
   * @returns Promise<JisrEmployeeDetail>
   */
  public async getEmployeeById(id: string | number): Promise<JisrEmployeeDetail> {
    const response = await this.request<JisrApiResponse<JisrEmployeeDetail>>(
      `/employees/${id}`,
      { params: { profile_tab: 'personal_and_organization' } }
    );

    return response.data;
  }

  // ===========================================================================
  // Department Methods
  // ===========================================================================

  /**
   * Get all departments with managers and hierarchy
   * @returns Promise<JisrDepartment[]>
   */
  public async getDepartments(): Promise<JisrDepartment[]> {
    const response = await this.request<{ data: { departments: JisrDepartment[] } }>(
      '/departments'
    );

    // Handle nested response format: { data: { departments: [...] } }
    if (response?.data?.departments && Array.isArray(response.data.departments)) {
      return response.data.departments.map(dept => {
        const rawDept = dept as JisrDepartment & { name_i18n?: string; manager?: { id?: number; name_i18n?: string } };
        return {
          ...dept,
          name: rawDept.name_i18n || dept.name,
          manager_id: rawDept.manager?.id,
          manager_name: rawDept.manager?.name_i18n,
        };
      });
    }

    return [];
  }

  // ===========================================================================
  // Location Methods
  // ===========================================================================

  /**
   * Get all locations (nested: countries > areas > locations)
   * Returns a flattened list of locations with country and area information
   * @returns Promise<JisrLocation[]>
   */
  public async getLocations(): Promise<JisrLocation[]> {
    const response = await this.request<{ data: { countries: JisrCountry[] } }>(
      '/organizations/countries'
    );

    const locations: JisrLocation[] = [];
    const countries = response?.data?.countries || [];

    // Flatten the nested structure
    for (const country of countries) {
      const countryName = (country as { name_i18n?: string }).name_i18n || country.name;
      if (country.areas) {
        for (const area of country.areas) {
          const areaName = (area as { name_i18n?: string }).name_i18n || area.name;
          if (area.locations) {
            for (const location of area.locations) {
              locations.push({
                id: location.id,
                name: (location as { name_i18n?: string }).name_i18n || location.name,
                name_ar: location.name_ar,
                address: location.address,
                area_id: area.id,
                area_name: areaName,
                country_id: country.id,
                country_name: countryName,
                is_active: location.is_active,
              });
            }
          }
          // If no locations under area, treat area as location
          if (!area.locations || area.locations.length === 0) {
            locations.push({
              id: area.id,
              name: areaName,
              name_ar: area.name_ar,
              area_id: area.id,
              area_name: areaName,
              country_id: country.id,
              country_name: countryName,
              is_active: true,
            });
          }
        }
      }
    }

    return locations;
  }

  /**
   * Get raw locations data with full hierarchy
   * @returns Promise<JisrCountry[]>
   */
  public async getLocationsHierarchy(): Promise<JisrCountry[]> {
    const response = await this.request<JisrApiResponse<JisrCountry[]>>(
      '/organizations/countries'
    );

    return Array.isArray(response.data) ? response.data : [];
  }

  // ===========================================================================
  // Job Title Methods
  // ===========================================================================

  /**
   * Get all job titles
   * @returns Promise<JisrJobTitle[]>
   */
  public async getJobTitles(): Promise<JisrJobTitle[]> {
    interface JobTitleResponse {
      id: number;
      name: string;
      name_ar?: string;
      name_i18n?: string;
      category?: {
        id: number;
        name_en?: string;
        name_ar?: string;
        name_i18n?: string;
      };
    }

    const response = await this.request<{ data: { job_titles: JobTitleResponse[] } }>(
      '/job_titles/'
    );

    const jobTitles = response?.data?.job_titles || [];

    return jobTitles.map(jt => ({
      id: jt.id,
      name: jt.name_i18n || jt.name,
      name_ar: jt.name_ar,
      category_id: jt.category?.id,
      category_name: jt.category?.name_i18n || jt.category?.name_en,
      is_active: true,
    }));
  }

  /**
   * Get job titles with categories
   * @returns Promise<JisrJobTitleCategory[]>
   */
  public async getJobTitleCategories(): Promise<JisrJobTitleCategory[]> {
    const response = await this.request<JisrApiResponse<JisrJobTitleCategory[]>>(
      '/job_titles/'
    );

    return Array.isArray(response.data) ? response.data : [];
  }

  // ===========================================================================
  // Nationality Methods
  // ===========================================================================

  /**
   * Get all nationalities
   * @returns Promise<JisrNationality[]>
   */
  public async getNationalities(): Promise<JisrNationality[]> {
    const response = await this.request<JisrApiResponse<JisrNationality[]> | JisrPaginatedResponse<JisrNationality>>(
      '/nationalities/'
    );

    // Handle both response formats
    if ('data' in response) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if ('data' in response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
    }

    return [];
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a Jisr client from environment variables
 * Expects JISR_ACCESS_TOKEN and JISR_COMPANY_SLUG to be set
 */
export function createJisrClientFromEnv(overrides?: Partial<JisrClientConfig>): JisrClient {
  const accessToken = process.env.JISR_ACCESS_TOKEN;
  const companySlug = process.env.JISR_COMPANY_SLUG;

  if (!accessToken) {
    throw new JisrClientError('JISR_ACCESS_TOKEN environment variable is not set');
  }
  if (!companySlug) {
    throw new JisrClientError('JISR_COMPANY_SLUG environment variable is not set');
  }

  return new JisrClient({
    accessToken,
    companySlug,
    baseUrl: process.env.JISR_BASE_URL,
    locale: (process.env.JISR_LOCALE as JisrLocale) || 'en',
    ...overrides,
  });
}

export default JisrClient;
