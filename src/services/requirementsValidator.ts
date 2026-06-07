import type {StoredID} from '../storage/idStorage';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Eligibility gates on a session (not disclosure — v1 submits nullifier only). */
export interface Query {
  nationality?: {
    in?: string[];
    out?: string[];
    eq?: string;
  };
  issuing_country?: {
    in?: string[];
    out?: string[];
    eq?: string;
  };
  age?: {
    gte?: number;
    gt?: number;
    lte?: number;
    lt?: number;
    range?: [number, number];
    eq?: number;
  };
  gender?: {eq?: string};
  document_type?: {eq?: string};
}

function calculateAge(dateOfBirth: string): number {
  let year: number;
  let month: number;
  let day: number;

  if (dateOfBirth.length === 6) {
    const yy = parseInt(dateOfBirth.slice(0, 2), 10);
    year = yy >= 50 ? 1900 + yy : 2000 + yy;
    month = parseInt(dateOfBirth.slice(2, 4), 10);
    day = parseInt(dateOfBirth.slice(4, 6), 10);
  } else if (dateOfBirth.includes('-')) {
    const parts = dateOfBirth.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    return -1;
  }

  const today = new Date();
  const birthDate = new Date(year, month - 1, day);

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

function isDocumentExpired(expiryDate: string): boolean {
  let year: number;
  let month: number;
  let day: number;

  if (expiryDate.length === 6) {
    const yy = parseInt(expiryDate.slice(0, 2), 10);
    year = yy >= 50 ? 1900 + yy : 2000 + yy;
    month = parseInt(expiryDate.slice(2, 4), 10);
    day = parseInt(expiryDate.slice(4, 6), 10);
  } else if (expiryDate.includes('-')) {
    const parts = expiryDate.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    return false;
  }

  const expiry = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expiry < today;
}

export function validateIDAgainstQuery(
  id: StoredID,
  query?: Query | null,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!id.sodHash) {
    errors.push(
      'This document is missing scan verification data. Remove it and scan again.',
    );
  }

  if (!query || Object.keys(query).length === 0) {
    return {valid: errors.length === 0, errors, warnings};
  }

  if (isDocumentExpired(id.expiryDate)) {
    errors.push('This document has expired and cannot be used for verification.');
  }

  if (query.nationality) {
    const nationality = id.nationality?.toUpperCase();

    if (query.nationality.in && Array.isArray(query.nationality.in)) {
      const allowed = query.nationality.in.map(n => n.toUpperCase());
      if (!allowed.includes(nationality)) {
        errors.push(
          `Nationality must be one of: ${query.nationality.in.join(', ')}. Your nationality is ${nationality}.`,
        );
      }
    }

    if (query.nationality.out && Array.isArray(query.nationality.out)) {
      const excluded = query.nationality.out.map(n => n.toUpperCase());
      if (excluded.includes(nationality)) {
        errors.push(
          `Nationality ${nationality} is not allowed for this verification.`,
        );
      }
    }

    if (query.nationality.eq) {
      if (nationality !== query.nationality.eq.toUpperCase()) {
        errors.push(
          `Nationality must be ${query.nationality.eq}. Your nationality is ${nationality}.`,
        );
      }
    }
  }

  if (query.issuing_country) {
    const issuingCountry = id.issuingCountry?.toUpperCase();

    if (query.issuing_country.in && Array.isArray(query.issuing_country.in)) {
      const allowed = query.issuing_country.in.map(c => c.toUpperCase());
      if (!allowed.includes(issuingCountry)) {
        errors.push(
          `Issuing country must be one of: ${query.issuing_country.in.join(', ')}. Your document is from ${issuingCountry}.`,
        );
      }
    }

    if (query.issuing_country.out && Array.isArray(query.issuing_country.out)) {
      const excluded = query.issuing_country.out.map(c => c.toUpperCase());
      if (excluded.includes(issuingCountry)) {
        errors.push(
          `Documents from ${issuingCountry} are not allowed for this verification.`,
        );
      }
    }

    if (query.issuing_country.eq) {
      if (issuingCountry !== query.issuing_country.eq.toUpperCase()) {
        errors.push(
          `Issuing country must be ${query.issuing_country.eq}. Your document is from ${issuingCountry}.`,
        );
      }
    }
  }

  if (query.age) {
    const age = calculateAge(id.dateOfBirth);

    if (age < 0) {
      warnings.push('Could not calculate age from date of birth.');
    } else {
      if (query.age.gte != null && age < query.age.gte) {
        errors.push(
          `You must be at least ${query.age.gte} years old. You are ${age}.`,
        );
      }

      if (query.age.gt != null && age <= query.age.gt) {
        errors.push(
          `You must be older than ${query.age.gt} years. You are ${age}.`,
        );
      }

      if (query.age.lte != null && age > query.age.lte) {
        errors.push(
          `You must be at most ${query.age.lte} years old. You are ${age}.`,
        );
      }

      if (query.age.lt != null && age >= query.age.lt) {
        errors.push(
          `You must be younger than ${query.age.lt} years. You are ${age}.`,
        );
      }

      if (
        query.age.range &&
        Array.isArray(query.age.range) &&
        query.age.range.length === 2
      ) {
        const [min, max] = query.age.range;
        if (age < min || age > max) {
          errors.push(`Age must be between ${min} and ${max}. You are ${age}.`);
        }
      }

      if (query.age.eq != null && age !== query.age.eq) {
        errors.push(`Age must be exactly ${query.age.eq}. You are ${age}.`);
      }
    }
  }

  if (query.gender?.eq) {
    const gender = id.gender?.toUpperCase();
    const required = query.gender.eq.toUpperCase();
    if (gender !== required) {
      errors.push(
        `Gender must be ${query.gender.eq}. Your document shows ${id.gender || 'unknown'}.`,
      );
    }
  }

  if (query.document_type?.eq) {
    const docType = id.documentType?.toLowerCase();
    const required = query.document_type.eq.toLowerCase();
    if (docType !== required) {
      errors.push(
        `Document type must be ${query.document_type.eq}. You have a ${id.documentType}.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatRequirementsSummary(query?: Query | null): string[] {
  if (!query) {
    return [];
  }

  const requirements: string[] = [];

  if (query.nationality?.in?.length) {
    requirements.push(`Nationality: ${query.nationality.in.join(', ')}`);
  }
  if (query.nationality?.out?.length) {
    requirements.push(`Nationality NOT: ${query.nationality.out.join(', ')}`);
  }
  if (query.issuing_country?.in?.length) {
    requirements.push(
      `Issuing country: ${query.issuing_country.in.join(', ')}`,
    );
  }
  if (query.issuing_country?.out?.length) {
    requirements.push(
      `Issuing country NOT: ${query.issuing_country.out.join(', ')}`,
    );
  }
  if (query.age?.gte != null) {
    requirements.push(`Minimum age: ${query.age.gte}`);
  }
  if (query.age?.gt != null) {
    requirements.push(`Age greater than: ${query.age.gt}`);
  }
  if (query.age?.lte != null) {
    requirements.push(`Maximum age: ${query.age.lte}`);
  }
  if (query.age?.lt != null) {
    requirements.push(`Age less than: ${query.age.lt}`);
  }
  if (query.age?.range) {
    requirements.push(`Age range: ${query.age.range[0]}-${query.age.range[1]}`);
  }
  if (query.gender?.eq) {
    requirements.push(`Gender: ${query.gender.eq}`);
  }
  if (query.document_type?.eq) {
    requirements.push(`Document type: ${query.document_type.eq}`);
  }

  return requirements;
}
