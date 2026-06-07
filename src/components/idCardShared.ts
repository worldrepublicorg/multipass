import {Dimensions} from 'react-native';
import type {StoredID} from '../storage/idStorage';

export const CARD_WIDTH = Dimensions.get('window').width - 40;

export function getDocumentLabel(mrzDocCode?: string): string {
  const typeChar = mrzDocCode?.[0];
  if (typeChar === 'V') {
    return 'Visa';
  }
  if (!typeChar || typeChar === 'P') {
    return 'Passport';
  }
  return 'ID Card';
}

/** MRZ document number with filler `<` characters removed. */
export function formatDocumentNumber(docNum: string): string {
  return docNum.replace(/</g, '').trim() || docNum;
}

/** Last four digits visible, e.g. `••••1234`. */
export function maskDocumentNumber(docNum: string): string {
  if (docNum.length <= 4) {
    return docNum;
  }
  return `••••${docNum.slice(-4)}`;
}

export function formatExpiry(date: string): string {
  if (!date) {
    return '—';
  }
  const parts = date.split('-');
  if (parts.length >= 3) {
    return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
  }
  if (parts.length >= 2) {
    return `${parts[1]}/${parts[0].slice(-2)}`;
  }
  return date;
}

export interface IDCardDisplayData {
  countryCode: string;
  docType: string;
  maskedDocNum: string;
  fullName: string;
  expiry: string;
}

export function getIDCardDisplayData(id: StoredID): IDCardDisplayData {
  return {
    countryCode: id.issuingCountry,
    docType: getDocumentLabel(id.mrzDocCode),
    maskedDocNum: maskDocumentNumber(formatDocumentNumber(id.documentNumber)),
    fullName: `${id.firstName} ${id.lastName}`.trim(),
    expiry: formatExpiry(id.expiryDate),
  };
}
