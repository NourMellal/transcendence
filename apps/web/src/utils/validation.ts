/**
 * Validation utilities for forms and user input
 */

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Email validation
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Password validation
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Username validation
 */
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];
  
  if (!username) {
    errors.push('Username is required');
  } else {
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (username.length > 20) {
      errors.push('Username must be no more than 20 characters long');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Tournament name validation
 */
export function validateTournamentName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name) {
    errors.push('Tournament name is required');
  } else {
    if (name.length < 3) {
      errors.push('Tournament name must be at least 3 characters long');
    }
    if (name.length > 50) {
      errors.push('Tournament name must be no more than 50 characters long');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 2FA code validation
 */
export function validate2FACode(code: string): ValidationResult {
  const errors: string[] = [];
  
  if (!code) {
    errors.push('2FA code is required');
  } else if (!/^\d{6}$/.test(code)) {
    errors.push('2FA code must be exactly 6 digits');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * File validation (for avatars)
 */
export function validateImageFile(file: File): ValidationResult {
  const errors: string[] = [];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
  }
  
  if (file.size > maxSize) {
    errors.push('Image file must be smaller than 5MB');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generic required field validation
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  const errors: string[] = [];
  
  if (!value || !value.trim()) {
    errors.push(`${fieldName} is required`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(result => result.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Form validation helper
 */
export function validateForm(fields: Record<string, string>, validators: Record<string, (value: string) => ValidationResult>): {
  isValid: boolean;
  fieldErrors: Record<string, string[]>;
  allErrors: string[];
} {
  const fieldErrors: Record<string, string[]> = {};
  const allErrors: string[] = [];
  
  Object.entries(validators).forEach(([fieldName, validator]) => {
    const result = validator(fields[fieldName] || '');
    if (!result.isValid) {
      fieldErrors[fieldName] = result.errors;
      allErrors.push(...result.errors);
    }
  });
  
  return {
    isValid: allErrors.length === 0,
    fieldErrors,
    allErrors
  };
}