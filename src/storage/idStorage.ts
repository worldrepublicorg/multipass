import EncryptedStorage from 'react-native-encrypted-storage';
import {Buffer} from 'buffer';

const ID_STORAGE_KEY = 'multipass_stored_id';

export interface StoredID {
  id: string;
  createdAt: number;
  /** zkPassport registry certificate root used at scan verify. */
  certRoot?: string;
  /** sha256(hex) of raw SOD bytes at scan — integrity check at submit. */
  sodHash?: string;
  dg1: string;
  sod: string;
  documentType: 'passport' | 'id_card';
  mrzDocCode?: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  nationality: string;
  issuingCountry: string;
  dateOfBirth: string;
  expiryDate: string;
  gender: string;
}

export async function getStoredID(): Promise<StoredID | null> {
  try {
    const data = await EncryptedStorage.getItem(ID_STORAGE_KEY);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as StoredID;
  } catch (error) {
    console.error('[idStorage] Failed to read ID:', error);
    return null;
  }
}

export async function saveStoredID(id: StoredID): Promise<void> {
  await EncryptedStorage.setItem(ID_STORAGE_KEY, JSON.stringify(id));
}

export async function deleteStoredID(): Promise<void> {
  await EncryptedStorage.removeItem(ID_STORAGE_KEY);
}

export async function hasStoredID(): Promise<boolean> {
  const id = await getStoredID();
  return id != null;
}

export function generateIDId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function parseChipDocument(
  dg1Base64: string,
  sodBase64: string,
): Omit<StoredID, 'id' | 'createdAt'> {
  const dg1 = Buffer.from(dg1Base64, 'base64');
  const mrz = extractMrzFromDG1(dg1);
  const parsed = parseMrz(mrz);

  return {
    dg1: dg1Base64,
    sod: sodBase64,
    documentType: parsed.mrzDocCode[0] === 'P' ? 'passport' : 'id_card',
    mrzDocCode: parsed.mrzDocCode,
    documentNumber: parsed.documentNumber,
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    nationality: parsed.nationality,
    issuingCountry: parsed.issuingCountry,
    dateOfBirth: formatDate(parsed.dateOfBirth),
    expiryDate: formatDate(parsed.expiryDate),
    gender: parsed.gender,
  };
}

function extractMrzFromDG1(dg1: Uint8Array): string {
  for (let i = 0; i < dg1.length - 2; i++) {
    if (dg1[i] === 0x5f && dg1[i + 1] === 0x1f) {
      const len = dg1[i + 2];
      const start = i + 3;
      if (start + len <= dg1.length) {
        return Buffer.from(dg1.slice(start, start + len)).toString('ascii');
      }
    }
  }
  return Buffer.from(dg1).toString('ascii');
}

function parseMrz(mrz: string) {
  const clean = mrz.replace(/\n/g, '').replace(/ /g, '');
  const mrzDocCode = clean.slice(0, 2);

  if (clean.length >= 88 && clean[0] === 'P') {
    const names = clean.slice(5, 44).split('<<');
    return {
      mrzDocCode,
      issuingCountry: clean.slice(2, 5).replace(/</g, ''),
      documentNumber: clean.slice(44, 53).replace(/</g, ''),
      nationality: clean.slice(54, 57).replace(/</g, ''),
      dateOfBirth: clean.slice(57, 63),
      gender: clean.slice(64, 65).replace(/</g, ''),
      expiryDate: clean.slice(65, 71),
      lastName: (names[0] || '').replace(/</g, ' ').trim(),
      firstName: (names[1] || '').replace(/</g, ' ').trim(),
    };
  }

  const line1 = clean.slice(0, 30);
  const line2 = clean.slice(30, 60);
  const line3 = clean.slice(60, 90);
  const names = line3.split('<<');

  return {
    mrzDocCode,
    issuingCountry: line1.slice(2, 5).replace(/</g, ''),
    documentNumber: line1.slice(5, 14).replace(/</g, ''),
    nationality: line2.slice(15, 18).replace(/</g, ''),
    dateOfBirth: line2.slice(0, 6),
    gender: line2.slice(7, 8).replace(/</g, ''),
    expiryDate: line2.slice(8, 14),
    lastName: (names[0] || '').replace(/</g, ' ').trim(),
    firstName: (names[1] || '').replace(/</g, ' ').trim(),
  };
}

function formatDate(yymmdd: string): string {
  if (yymmdd.length !== 6) {
    return yymmdd;
  }
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const century = yy > 50 ? '19' : '20';
  return `${century}${yymmdd.slice(0, 2)}-${mm}-${dd}`;
}
