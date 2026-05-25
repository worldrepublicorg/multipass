import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha2.js';
import { Binary, SOD } from '@zkpassport/utils';

export interface PassportBlobInput {
  dg1: string;
  sod: string;
  dg2?: string;
}

/** Passport view model used for plain verify and ZK circuit inputs. */
export function buildPassportViewModel(pd: PassportBlobInput): any {
  const dg1 = Binary.fromBase64(pd.dg1);
  const sod = SOD.fromDER(Binary.fromBase64(pd.sod));
  const mrz = extractMrzFromDG1(Buffer.from(pd.dg1, 'base64'));
  const mrzFields = parseMrz(mrz);
  const dgv = sod.encapContentInfo.eContent.dataGroupHashValues.values;
  const ldsHashAlgo = String(sod.encapContentInfo.eContent.hashAlgorithm);
  const dg1HashFromSod = dgv[1];
  const dg1HashArray = dg1HashFromSod
    ? dg1HashFromSod.toNumberArray()
    : Array.from(sha256(dg1.toUInt8Array()));
  const dg2FromSod = dgv[2];
  const dg2Group = pd.dg2
    ? (() => {
        const raw = Binary.fromBase64(pd.dg2!);
        return {
          groupNumber: 2,
          name: 'DG2',
          hash: dg2FromSod ? dg2FromSod.toNumberArray() : Array.from(sha256(raw.toUInt8Array())),
          value: raw.toNumberArray(),
        };
      })()
    : {
        groupNumber: 2,
        name: 'DG2',
        hash: dg2FromSod ? dg2FromSod.toNumberArray() : Array(32).fill(0),
        value: [],
      };
  return {
    dateOfIssue: '',
    appVersion: '',
    mrz,
    name: `${mrzFields.firstName} ${mrzFields.lastName}`.trim(),
    dateOfBirth: mrzFields.dateOfBirth,
    nationality: mrzFields.nationality,
    gender: mrzFields.gender,
    passportNumber: mrzFields.documentNumber,
    passportExpiry: mrzFields.expiryDate,
    firstName: mrzFields.firstName,
    lastName: mrzFields.lastName,
    fullName: `${mrzFields.firstName} ${mrzFields.lastName}`.trim(),
    photo: '',
    originalPhoto: '',
    chipAuthSupported: false,
    chipAuthSuccess: false,
    chipAuthFailed: false,
    LDSVersion: '',
    documentType: mrz[0] === 'P' ? 'passport' : 'id_card',
    dataGroups: [
      {
        groupNumber: 1,
        name: 'DG1',
        hash: dg1HashArray,
        value: dg1.toNumberArray(),
      },
      dg2Group,
    ],
    dataGroupsHashAlgorithm: ldsHashAlgo,
    sod,
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
  if (clean.length >= 88 && clean[0] === 'P') {
    const names = clean.slice(5, 44).split('<<');
    return {
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
