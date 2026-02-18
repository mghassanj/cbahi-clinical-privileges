"use client";

import { useState, useCallback, useEffect } from "react";
import { z } from "zod";

// =============================================================================
// Types & Schemas
// =============================================================================

export const scfhsNumberSchema = z
  .string()
  .min(1, "SCFHS number is required")
  .regex(
    /^\d{2}-\d{7}$/,
    "SCFHS number must be in format XX-XXXXXXX (e.g., 12-3456789)"
  );

export const personalInfoSchema = z.object({
  nameEn: z.string().min(1, "Name is required"),
  nameAr: z.string().optional(),
  employeeCode: z.string().optional(),
  department: z.string().optional(),
  departmentAr: z.string().optional(),
  jobTitle: z.string().optional(),
  jobTitleAr: z.string().optional(),
  location: z.string().optional(),
  locationAr: z.string().optional(),
  email: z.string().email("Invalid email address"),
  scfhsNumber: scfhsNumberSchema,
  hospitalCenter: z.string().min(1, "Hospital center is required"),
});

export const applicationTypeSchema = z.object({
  applicationType: z.enum(["new", "reapplication"], {
    message: "Please select an application type",
  }),
  reapplicationReason: z.string().optional(),
});

export const privilegeSelectionSchema = z.object({
  selectedPrivileges: z
    .array(z.string())
    .min(1, "Please select at least one privilege"),
});

export const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  url: z.string().optional(),
  driveFileId: z.string().optional(),
});

export const documentsSchema = z.object({
  educationCertificate: documentSchema.nullable(),
  scfhsRegistration: documentSchema.nullable(),
  nationalIdCopy: documentSchema.nullable(),
  passportPhoto: documentSchema.nullable(),
  additionalCertifications: z.array(documentSchema).optional(),
  cvResume: documentSchema.nullable().optional(),
});

export const reviewSchema = z.object({
  agreedToTerms: z
    .boolean()
    .refine((val) => val === true, "You must agree to the terms and conditions"),
});

export const privilegeRequestSchema = z.object({
  personalInfo: personalInfoSchema,
  applicationType: applicationTypeSchema,
  privileges: privilegeSelectionSchema,
  documents: documentsSchema,
  review: reviewSchema,
});

export type PersonalInfoData = z.infer<typeof personalInfoSchema>;
export type ApplicationTypeData = z.infer<typeof applicationTypeSchema>;
export type PrivilegeSelectionData = z.infer<typeof privilegeSelectionSchema>;
export type DocumentData = z.infer<typeof documentSchema>;
export type DocumentsData = z.infer<typeof documentsSchema>;
export type ReviewData = z.infer<typeof reviewSchema>;
export type PrivilegeRequestData = z.infer<typeof privilegeRequestSchema>;

export interface WizardState {
  currentStep: number;
  personalInfo: Partial<PersonalInfoData>;
  applicationType: Partial<ApplicationTypeData>;
  privileges: Partial<PrivilegeSelectionData>;
  documents: Partial<DocumentsData>;
  review: Partial<ReviewData>;
  isDraft: boolean;
  draftId: string | null;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface WizardActions {
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updatePersonalInfo: (data: Partial<PersonalInfoData>) => void;
  updateApplicationType: (data: Partial<ApplicationTypeData>) => void;
  updatePrivileges: (data: Partial<PrivilegeSelectionData>) => void;
  updateDocuments: (data: Partial<DocumentsData>) => void;
  updateReview: (data: Partial<ReviewData>) => void;
  validateCurrentStep: () => Promise<boolean>;
  saveDraft: () => Promise<string | null>;
  submit: () => Promise<{ success: boolean; requestId?: string; error?: string }>;
  loadDraft: (draftId: string) => Promise<void>;
  reset: () => void;
}

const DRAFT_STORAGE_KEY = "cbahi-privilege-request-draft";
const TOTAL_STEPS = 5;

const initialState: WizardState = {
  currentStep: 0,
  personalInfo: {},
  applicationType: {},
  privileges: { selectedPrivileges: [] },
  documents: {
    educationCertificate: null,
    scfhsRegistration: null,
    nationalIdCopy: null,
    passportPhoto: null,
    additionalCertifications: [],
    cvResume: null,
  },
  review: { agreedToTerms: false },
  isDraft: true,
  draftId: null,
  isSubmitting: false,
  isLoading: false,
  error: null,
};

// =============================================================================
// Hook Implementation
// =============================================================================

export function usePrivilegeRequest(
  initialDraftId?: string
): WizardState & WizardActions {
  const [state, setState] = useState<WizardState>(initialState);

  // Load draft from localStorage on mount
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLocalDraft = () => {
      try {
        const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (storedDraft) {
          const parsedDraft = JSON.parse(storedDraft);
          setState((prev) => ({
            ...prev,
            ...parsedDraft,
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error("Failed to load draft from localStorage:", error);
      }
    };

    if (initialDraftId) {
      loadDraft(initialDraftId);
    } else {
      loadLocalDraft();
    }
    // loadDraft is defined later but stable via useCallback
  }, [initialDraftId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window === "undefined" || state.isLoading) return;

    const saveToLocalStorage = () => {
      try {
        const dataToStore = {
          currentStep: state.currentStep,
          personalInfo: state.personalInfo,
          applicationType: state.applicationType,
          privileges: state.privileges,
          documents: state.documents,
          review: state.review,
          isDraft: state.isDraft,
          draftId: state.draftId,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(dataToStore));
      } catch (error) {
        console.error("Failed to save draft to localStorage:", error);
      }
    };

    const timeoutId = setTimeout(saveToLocalStorage, 500);
    return () => clearTimeout(timeoutId);
  }, [state]);

  const setCurrentStep = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setState((prev) => ({ ...prev, currentStep: step }));
    }
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
    }));
  }, []);

  const previousStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const updatePersonalInfo = useCallback((data: Partial<PersonalInfoData>) => {
    setState((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, ...data },
    }));
  }, []);

  const updateApplicationType = useCallback(
    (data: Partial<ApplicationTypeData>) => {
      setState((prev) => ({
        ...prev,
        applicationType: { ...prev.applicationType, ...data },
      }));
    },
    []
  );

  const updatePrivileges = useCallback(
    (data: Partial<PrivilegeSelectionData>) => {
      setState((prev) => ({
        ...prev,
        privileges: { ...prev.privileges, ...data },
      }));
    },
    []
  );

  const updateDocuments = useCallback((data: Partial<DocumentsData>) => {
    setState((prev) => ({
      ...prev,
      documents: { ...prev.documents, ...data },
    }));
  }, []);

  const updateReview = useCallback((data: Partial<ReviewData>) => {
    setState((prev) => ({
      ...prev,
      review: { ...prev.review, ...data },
    }));
  }, []);

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const { currentStep, personalInfo, applicationType, privileges, documents, review } =
      state;

    try {
      switch (currentStep) {
        case 0: // Personal Info
          await personalInfoSchema.parseAsync(personalInfo);
          return true;

        case 1: // Application Type
          await applicationTypeSchema.parseAsync(applicationType);
          // Additional validation for reapplication
          if (
            applicationType.applicationType === "reapplication" &&
            !applicationType.reapplicationReason?.trim()
          ) {
            setState((prev) => ({
              ...prev,
              error: "Please provide a reason for reapplication",
            }));
            return false;
          }
          return true;

        case 2: // Privileges
          await privilegeSelectionSchema.parseAsync(privileges);
          return true;

        case 3: // Documents
          // Check required documents
          if (!documents.educationCertificate) {
            setState((prev) => ({
              ...prev,
              error: "Education certificate is required",
            }));
            return false;
          }
          if (!documents.scfhsRegistration) {
            setState((prev) => ({
              ...prev,
              error: "SCFHS registration is required",
            }));
            return false;
          }
          if (!documents.nationalIdCopy) {
            setState((prev) => ({
              ...prev,
              error: "National ID copy is required",
            }));
            return false;
          }
          if (!documents.passportPhoto) {
            setState((prev) => ({
              ...prev,
              error: "Passport photo is required",
            }));
            return false;
          }
          return true;

        case 4: // Review
          await reviewSchema.parseAsync(review);
          return true;

        default:
          return true;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        setState((prev) => ({
          ...prev,
          error: firstError?.message || "Validation failed",
        }));
      }
      return false;
    }
  }, [state]);

  const saveDraft = useCallback(async (): Promise<string | null> => {
    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const draftPayload = {
        id: state.draftId,
        personalInfo: state.personalInfo,
        applicationType: state.applicationType,
        privileges: state.privileges,
        documents: state.documents,
      };

      let response = await fetch("/api/requests/draft", {
        method: state.draftId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload),
      });

      // If PUT returns 404 (stale draft ID), clear it and retry with POST
      if (response.status === 404 && state.draftId) {
        console.warn("Draft not found, creating new draft instead");
        response = await fetch("/api/requests/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draftPayload,
            id: undefined, // Clear the stale ID
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save draft");
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        draftId: data.id,
        isSubmitting: false,
      }));
      
      return data.id; // Return the draft ID for callers who need it immediately
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : "Failed to save draft",
      }));
      throw error; // Re-throw so callers can handle the failure
    }
  }, [state]);

  const submit = useCallback(async (): Promise<{ success: boolean; requestId?: string; error?: string }> => {
    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Validate all steps before submission
      const isValid = await validateCurrentStep();
      if (!isValid) {
        setState((prev) => ({ ...prev, isSubmitting: false }));
        return { success: false, error: "Validation failed" };
      }

      // If we have an existing draft, save it first then submit it
      // Otherwise create a new request and submit directly
      let currentDraftId = state.draftId;
      let requestId: string | undefined = currentDraftId || undefined;

      if (currentDraftId) {
        // First, save the latest draft data
        let saveResponse = await fetch("/api/requests/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentDraftId,
            personalInfo: state.personalInfo,
            applicationType: state.applicationType,
            privileges: state.privileges,
            documents: state.documents,
          }),
        });

        // If PUT returns 404 (stale draft ID), create a new draft instead
        if (saveResponse.status === 404) {
          console.warn("Draft not found during submission, creating new draft");
          saveResponse = await fetch("/api/requests/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              personalInfo: state.personalInfo,
              applicationType: state.applicationType,
              privileges: state.privileges,
              documents: state.documents,
            }),
          });

          if (!saveResponse.ok) {
            throw new Error("Failed to create draft before submission");
          }

          const newDraft = await saveResponse.json();
          currentDraftId = newDraft.id;
          requestId = newDraft.id;
        } else if (!saveResponse.ok) {
          throw new Error("Failed to save draft before submission");
        }

        // Then submit the draft
        const submitResponse = await fetch(`/api/requests/${currentDraftId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!submitResponse.ok) {
          const result = await submitResponse.json();
          throw new Error(result.message || "Failed to submit request");
        }

        const submitResult = await submitResponse.json().catch(() => ({}));
        requestId = submitResult?.data?.id || currentDraftId || requestId;
      } else {
        // Create and submit a new request in one go
        const response = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personalInfo: state.personalInfo,
            applicationType: state.applicationType,
            privileges: state.privileges,
            documents: state.documents,
            submit: true, // Flag to indicate immediate submission
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || "Failed to submit request");
        }

        const result = await response.json().catch(() => ({}));
        requestId = result?.data?.id || requestId;
      }

      // Clear localStorage on successful submission
      if (typeof window !== "undefined") {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        isDraft: false,
        draftId: requestId || prev.draftId,
      }));

      return { success: true, requestId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to submit request";
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [state, validateCurrentStep]);

  const loadDraft = useCallback(async (draftId: string): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/requests/draft/${draftId}`);

      if (!response.ok) {
        throw new Error("Failed to load draft");
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        ...data,
        draftId,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load draft",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
    setState(initialState);
  }, []);

  return {
    ...state,
    setCurrentStep,
    nextStep,
    previousStep,
    updatePersonalInfo,
    updateApplicationType,
    updatePrivileges,
    updateDocuments,
    updateReview,
    validateCurrentStep,
    saveDraft,
    submit,
    loadDraft,
    reset,
  };
}

export default usePrivilegeRequest;
