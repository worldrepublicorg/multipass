package org.worldrepublic.multipass.emrtdreader;

import android.util.Log;

import net.sf.scuba.smartcards.CardFileInputStream;
import net.sf.scuba.smartcards.CardServiceException;
import net.sf.scuba.smartcards.CommandAPDU;
import net.sf.scuba.smartcards.ResponseAPDU;

import org.jmrtd.PassportService;
import org.jmrtd.lds.CardAccessFile;
import org.jmrtd.lds.CardSecurityFile;
import org.jmrtd.lds.PACEInfo;
import org.jmrtd.lds.SecurityInfo;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Reads EF.CardAccess / EF.CardSecurity using several selection strategies.
 * Some eIDs (e.g. newer Hungarian cards) reject SFI-based READ BINARY (6982) but
 * accept SELECT-by-FID (P1=02) followed by offset READ BINARY.
 */
final class EmrtdCardAccessReader {

    private static final String TAG = "EmrtdReader";
    private static final int MAX_FILE_BYTES = 4096;

    private EmrtdCardAccessReader() {}

    static List<PACEInfo> loadPaceInfos(PassportService service) {
        List<PACEInfo> paceInfos = new ArrayList<>();
        for (short fid : new short[] {
            PassportService.EF_CARD_ACCESS,
            PassportService.EF_CARD_SECURITY
        }) {
            byte[] raw = readSecurityFile(service, fid);
            if (raw == null || raw.length == 0) continue;
            try {
                paceInfos.addAll(parsePaceInfos(fid, raw));
            } catch (Exception e) {
                Log.w(TAG, "Could not parse security file " + Integer.toHexString(fid) + ": " + e.getMessage());
            }
        }
        return paceInfos;
    }

    private static Collection<PACEInfo> parsePaceInfos(short fid, byte[] raw) throws Exception {
        List<PACEInfo> result = new ArrayList<>();
        InputStream in = new ByteArrayInputStream(raw);
        if (fid == PassportService.EF_CARD_ACCESS) {
            for (SecurityInfo si : new CardAccessFile(in).getSecurityInfos()) {
                if (si instanceof PACEInfo) {
                    result.add((PACEInfo) si);
                }
            }
        } else {
            CardSecurityFile csf = new CardSecurityFile(in);
            Collection<PACEInfo> paceOnly = csf.getPACEInfos();
            if (paceOnly != null) {
                result.addAll(paceOnly);
            }
            if (result.isEmpty()) {
                for (SecurityInfo si : csf.getSecurityInfos()) {
                    if (si instanceof PACEInfo) {
                        result.add((PACEInfo) si);
                    }
                }
            }
        }
        return result;
    }

    private static byte[] readSecurityFile(PassportService service, short fid) {
        String fidHex = Integer.toHexString(fid);
        byte[] viaFid = readFileByFidSelect(service, fid);
        if (viaFid != null && viaFid.length > 0) {
            Log.d(TAG, "Card security file 0x" + fidHex + " read via FID select: " + viaFid.length + " bytes");
            return viaFid;
        }
        byte[] viaStream = readFileViaInputStream(service, fid);
        if (viaStream != null && viaStream.length > 0) {
            Log.d(TAG, "Card security file 0x" + fidHex + " read via getInputStream: " + viaStream.length + " bytes");
            return viaStream;
        }
        Log.w(TAG, "Could not read card security file 0x" + fidHex);
        return null;
    }

    /** SELECT EF by file ID (P1=02) then READ BINARY with offset (no SFI). */
    static byte[] readFileByFidSelect(PassportService service, short fid) {
        try {
            byte[] fidBytes = new byte[] {
                (byte) ((fid >> 8) & 0xFF),
                (byte) (fid & 0xFF)
            };
            CommandAPDU select = new CommandAPDU(0x00, 0xA4, 0x02, 0x0C, fidBytes);
            ResponseAPDU response = service.transmit(select);
            if (response.getSW() != 0x9000) {
                Log.w(TAG, "SELECT FID 0x" + Integer.toHexString(fid)
                    + " failed: SW=" + Integer.toHexString(response.getSW()));
                return null;
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            int offset = 0;
            while (out.size() < MAX_FILE_BYTES) {
                CommandAPDU read = new CommandAPDU(
                    0x00, 0xB0,
                    (offset >> 8) & 0xFF,
                    offset & 0xFF,
                    256);
                response = service.transmit(read);
                int sw = response.getSW();
                if (sw == 0x9000) {
                    byte[] chunk = response.getData();
                    if (chunk == null || chunk.length == 0) break;
                    out.write(chunk, 0, chunk.length);
                    offset += chunk.length;
                    if (chunk.length < 256) break;
                } else if ((sw & 0xFF00) == 0x6C00) {
                    int le = sw & 0xFF;
                    read = new CommandAPDU(
                        0x00, 0xB0,
                        (offset >> 8) & 0xFF,
                        offset & 0xFF,
                        le);
                    response = service.transmit(read);
                    if (response.getSW() != 0x9000) break;
                    byte[] chunk = response.getData();
                    if (chunk != null && chunk.length > 0) {
                        out.write(chunk, 0, chunk.length);
                        offset += chunk.length;
                    }
                    break;
                } else {
                    if (offset == 0) {
                        Log.w(TAG, "READ BINARY FID 0x" + Integer.toHexString(fid)
                            + " failed: SW=" + Integer.toHexString(sw));
                        return null;
                    }
                    break;
                }
            }
            return out.size() > 0 ? out.toByteArray() : null;
        } catch (CardServiceException e) {
            Log.w(TAG, "readFileByFidSelect 0x" + Integer.toHexString(fid) + ": " + e.getMessage());
            return null;
        }
    }

    private static byte[] readFileViaInputStream(PassportService service, short fid) {
        try {
            CardFileInputStream in = service.getInputStream(fid);
            int len = in.getLength();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[256];
            int read;
            while ((read = in.read(buf)) > 0) {
                out.write(buf, 0, read);
                if (len > 0 && out.size() >= len) break;
                if (out.size() >= MAX_FILE_BYTES) break;
            }
            return out.size() > 0 ? out.toByteArray() : null;
        } catch (Exception e) {
            Log.w(TAG, "getInputStream 0x" + Integer.toHexString(fid) + ": " + e.getMessage());
            return null;
        }
    }
}
