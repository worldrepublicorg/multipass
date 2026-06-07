package org.worldrepublic.multipass.mrzscanner;

import android.util.Log;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses TD1/TD3 MRZ with ICAO check-digit validation and corrects common OCR
 * ambiguities (0/O, 1/I, 8/B) on document numbers that mix letters and digits.
 */
final class MrzParser {

    private static final String TAG = "MrzScanActivity";

    private static final Pattern TD3_L2 = Pattern.compile(
        "([A-Z0-9<]{9})(\\d)([A-Z<]{3})(\\d{6})(\\d)[MF<](\\d{6})(\\d)");
    private static final Pattern TD1_L1 = Pattern.compile(
        "[IAC][A-Z<]([A-Z<]{3})([A-Z0-9<]{9})(\\d)");
    private static final Pattern TD1_L2 = Pattern.compile(
        "(\\d{6})(\\d)[MF<](\\d{6})(\\d)");

    static final class Fields {
        final String documentNumber;
        final String dateOfBirth;
        final String dateOfExpiry;

        Fields(String documentNumber, String dateOfBirth, String dateOfExpiry) {
            this.documentNumber = documentNumber;
            this.dateOfBirth = dateOfBirth;
            this.dateOfExpiry = dateOfExpiry;
        }
    }

    private enum CharKind { LETTER, DIGIT }

    private enum DocTemplate {
        START_TWO_LETTERS,
        END_TWO_LETTERS,
    }

    static Fields parse(String text) {
        if (text == null || text.isEmpty()) return null;
        String raw = text.replace("«", "<").replace(" ", "").toUpperCase();
        String compact = raw.replace("\n", "");

        Fields fromBlock = tryParseTd3Block(compact);
        if (fromBlock != null) return fromBlock;

        fromBlock = tryParseTd1Block(compact);
        if (fromBlock != null) return fromBlock;

        String[] lines = raw.split("\n");
        for (int i = 0; i < lines.length - 1; i++) {
            if (lines[i + 1].length() >= 28) {
                Fields td3 = parseTd3Line2(lines[i + 1]);
                if (td3 != null) return td3;
            }
        }
        for (int i = 0; i < lines.length - 2; i++) {
            Fields td1 = parseTd1Lines(lines[i], lines[i + 1]);
            if (td1 != null) return td1;
        }
        return null;
    }

    private static Fields tryParseTd3Block(String compact) {
        if (compact.length() < 88 || compact.charAt(0) != 'P') return null;
        return parseTd3Line2(compact.substring(44, 88));
    }

    private static Fields tryParseTd1Block(String compact) {
        if (compact.length() < 90) return null;
        return parseTd1Lines(compact.substring(0, 30), compact.substring(30, 60));
    }

    private static Fields parseTd3Line2(String line2) {
        if (line2.length() < 28) return null;
        Matcher m = TD3_L2.matcher(line2);
        if (!m.find()) return null;
        return validateTd3(
            m.group(1), m.group(2).charAt(0),
            m.group(4), m.group(5).charAt(0),
            m.group(6), m.group(7).charAt(0));
    }

    private static Fields parseTd1Lines(String line1, String line2) {
        Matcher m1 = TD1_L1.matcher(line1);
        Matcher m2 = TD1_L2.matcher(line2);
        if (!m1.find() || !m2.find()) return null;
        return validateTd1(
            m1.group(2), m1.group(3).charAt(0),
            m2.group(1), m2.group(2).charAt(0),
            m2.group(3), m2.group(4).charAt(0));
    }

    private static Fields validateTd3(
        String docField, char docCheck,
        String dob, char dobCheck,
        String expiry, char expiryCheck) {
        String fixedDoc = resolveDocumentField(docField, docCheck);
        if (fixedDoc == null) return null;
        if (!verifyCheckDigit(dob, dobCheck)) return null;
        if (!verifyCheckDigit(expiry, expiryCheck)) return null;
        if (!fixedDoc.equals(docField)) {
            Log.d(TAG, "MRZ doc corrected: " + docField.replace("<", "") + " -> " + fixedDoc.replace("<", ""));
        }
        return toFields(fixedDoc, dob, expiry);
    }

    private static Fields validateTd1(
        String docField, char docCheck,
        String dob, char dobCheck,
        String expiry, char expiryCheck) {
        String fixedDoc = resolveDocumentField(docField, docCheck);
        if (fixedDoc == null) return null;
        if (!verifyCheckDigit(dob, dobCheck)) return null;
        if (!verifyCheckDigit(expiry, expiryCheck)) return null;
        if (!fixedDoc.equals(docField)) {
            Log.d(TAG, "MRZ doc corrected: " + docField.replace("<", "") + " -> " + fixedDoc.replace("<", ""));
        }
        return toFields(fixedDoc, dob, expiry);
    }

    private static Fields toFields(String docField, String dob, String expiry) {
        String docNum = docField.replace("<", "");
        if (docNum.length() < 2) return null;
        return new Fields(docNum, dob, expiry);
    }

    /** ICAO 9303 check digit (weights 7, 3, 1). */
    static int computeCheckDigit(String data) {
        int sum = 0;
        for (int i = 0; i < data.length(); i++) {
            int v = charValue(data.charAt(i));
            if (v < 0) return -1;
            int weight = (i % 3 == 0) ? 7 : (i % 3 == 1) ? 3 : 1;
            sum += v * weight;
        }
        return sum % 10;
    }

    static boolean verifyCheckDigit(String data, char checkChar) {
        if (!Character.isDigit(checkChar)) return false;
        int expected = computeCheckDigit(data);
        if (expected < 0) return false;
        return expected == (checkChar - '0');
    }

    private static int charValue(char c) {
        if (c == '<') return 0;
        if (c >= '0' && c <= '9') return c - '0';
        if (c >= 'A' && c <= 'Z') return c - 'A' + 10;
        return -1;
    }

    private static boolean isLetter(char c) {
        return (c >= 'A' && c <= 'Z') || c == '<';
    }

    private static boolean isDigit(char c) {
        return c >= '0' && c <= '9';
    }

    private static boolean isAmbiguous(char c) {
        return c == '0' || c == 'O' || c == '1' || c == 'I' || c == '8' || c == 'B';
    }

    private static char toDigitForm(char c) {
        switch (c) {
            case 'O': return '0';
            case 'I': return '1';
            case 'B': return '8';
            default: return c;
        }
    }

    private static char toLetterForm(char c) {
        switch (c) {
            case '0': return 'O';
            case '1': return 'I';
            case '8': return 'B';
            default: return c;
        }
    }

    /**
     * Fix OCR confusion on document number fields that use two letters at the start
     * or end and digits elsewhere (e.g. BH0266621).
     */
    static String resolveDocumentField(String docField, char docCheck) {
        if (docField == null || docField.length() != 9) return null;
        if (verifyCheckDigit(docField, docCheck)) return docField;

        for (DocTemplate template : DocTemplate.values()) {
            String corrected = applyTemplateCorrections(docField, docCheck, template);
            if (corrected != null) return corrected;
        }

        return bruteForceAmbiguous(docField, docCheck);
    }

    private static String applyTemplateCorrections(String docField, char docCheck, DocTemplate template) {
        char[] chars = docField.toCharArray();
        boolean changed = false;
        for (int i = 0; i < 9; i++) {
            char c = chars[i];
            if (c == '<') continue;
            CharKind expected = expectedKind(i, template);
            if (expected == null) continue;
            if (!isAmbiguous(c)) continue;
            char fixed = (expected == CharKind.LETTER) ? toLetterForm(c) : toDigitForm(c);
            if (fixed != c) {
                chars[i] = fixed;
                changed = true;
            } else if ((expected == CharKind.LETTER && isDigit(c))
                || (expected == CharKind.DIGIT && isLetter(c) && c != '<')) {
                return null;
            }
        }
        String candidate = new String(chars);
        if (verifyCheckDigit(candidate, docCheck)) {
            return candidate;
        }
        if (changed) {
            return bruteForceAmbiguous(candidate, docCheck);
        }
        return null;
    }

    private static CharKind expectedKind(int index, DocTemplate template) {
        switch (template) {
            case START_TWO_LETTERS:
                if (index <= 1) return CharKind.LETTER;
                return CharKind.DIGIT;
            case END_TWO_LETTERS:
                if (index >= 7) return CharKind.LETTER;
                return CharKind.DIGIT;
            default:
                return null;
        }
    }

    private static String bruteForceAmbiguous(String docField, char docCheck) {
        List<Integer> indices = new ArrayList<>();
        for (int i = 0; i < docField.length(); i++) {
            char c = docField.charAt(i);
            if (c != '<' && isAmbiguous(c)) {
                indices.add(i);
            }
        }
        if (indices.isEmpty()) return null;
        int combinations = 1 << indices.size();
        if (combinations > 64) return null;

        for (int mask = 0; mask < combinations; mask++) {
            char[] chars = docField.toCharArray();
            for (int b = 0; b < indices.size(); b++) {
                int idx = indices.get(b);
                char c = chars[idx];
                boolean useLetter = (mask & (1 << b)) != 0;
                chars[idx] = useLetter ? toLetterForm(c) : toDigitForm(c);
            }
            String candidate = new String(chars);
            if (verifyCheckDigit(candidate, docCheck)) {
                return candidate;
            }
        }
        return null;
    }
}
