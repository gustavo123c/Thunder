import { useCallback, useState } from 'react';

import type { ProfileFormErrors, ProfileFormValues } from '../profile-form';

export type SetProfileField = <K extends keyof ProfileFormValues>(
  field: K,
  value: ProfileFormValues[K],
) => void;

/** Shared form state for onboarding and profile edit. Editing a field clears its error. */
export function useProfileFormState(initial: ProfileFormValues) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<ProfileFormErrors>({});

  const setField: SetProfileField = useCallback((field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }, []);

  return { values, errors, setErrors, setField };
}
