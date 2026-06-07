package org.worldrepublic.multipass.mrzscanner;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.util.Size;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ExperimentalGetImage;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.ArrayList;

/**
 * Full-screen camera Activity for MRZ scanning.
 * Launched via Intent, returns result via static callback.
 */
public class MrzScanActivity extends AppCompatActivity {
    private static final String TAG = "MrzScanActivity";
    private static final int CAMERA_PERM = 100;

    static MrzCallback sCallback;
    private TextRecognizer recognizer;
    private ExecutorService executor;
    private volatile boolean found = false;
    private PreviewView previewView;
    private TextView hintText;
    private final ArrayList<String> acceptedReads = new ArrayList<>();
    private long lastAcceptedAtMs = 0L;
    private static final long SAMPLE_INTERVAL_MS = 450L;
    private static final int REQUIRED_MATCHES = 3;
    private static final String HINT_DEFAULT =
        "Fit your document inside the frame";
    private static final String HINT_HOLD_STEADY = "Hold steady…";
    private static final String HINT_MISMATCH =
        "Couldn't read clearly. Adjust angle or lighting and try again";

    public interface MrzCallback {
        void onMrzResult(String docNum, String dob, String expiry);
        void onMrzError(String error);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Build UI programmatically — no XML layout needed
        FrameLayout root = new FrameLayout(this);
        root.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        previewView = new PreviewView(this);
        previewView.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(previewView);

        MrzGuideOverlayView overlay = new MrzGuideOverlayView(this);
        overlay.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(overlay);

        hintText = new TextView(this);
        hintText.setText(HINT_DEFAULT);
        hintText.setTextColor(0xFFFFFFFF);
        hintText.setTextSize(17);
        hintText.setTextAlignment(TextView.TEXT_ALIGNMENT_CENTER);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.gravity = Gravity.BOTTOM;
        lp.setMargins(32, 32, 32, 120);
        hintText.setLayoutParams(lp);
        hintText.setShadowLayer(4, 0, 0, 0xFF000000);
        root.addView(hintText);

        setContentView(root);

        recognizer = TextRecognition.getClient(new TextRecognizerOptions.Builder().build());
        executor = Executors.newSingleThreadExecutor();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, CAMERA_PERM);
        }
    }

    @Override
    public void onRequestPermissionsResult(int req, @NonNull String[] perms, @NonNull int[] grants) {
        super.onRequestPermissionsResult(req, perms, grants);
        if (req == CAMERA_PERM && grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            if (sCallback != null) sCallback.onMrzError("Camera permission denied");
            finish();
        }
    }

    private void startCamera() {
        ProcessCameraProvider.getInstance(this).addListener(() -> {
            try {
                ProcessCameraProvider cp = ProcessCameraProvider.getInstance(this).get();
                cp.unbindAll();

                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                ImageAnalysis analysis = new ImageAnalysis.Builder()
                    .setTargetResolution(new Size(1280, 720))
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build();
                analysis.setAnalyzer(executor, this::analyzeFrame);

                cp.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis);
                Log.d(TAG, "Camera started");
            } catch (Exception e) {
                Log.e(TAG, "Camera failed", e);
                if (sCallback != null) sCallback.onMrzError("Camera error: " + e.getMessage());
                finish();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    @OptIn(markerClass = ExperimentalGetImage.class)
    private void analyzeFrame(ImageProxy proxy) {
        if (found) { proxy.close(); return; }
        android.media.Image img = proxy.getImage();
        if (img == null) { proxy.close(); return; }

        InputImage input = InputImage.fromMediaImage(img, proxy.getImageInfo().getRotationDegrees());
        recognizer.process(input)
            .addOnSuccessListener(text -> {
                if (found) return;
                MrzParser.Fields fields = MrzParser.parse(text.getText());
                if (fields != null) {
                    handleRead(new String[] {
                        fields.documentNumber,
                        fields.dateOfBirth,
                        fields.dateOfExpiry
                    });
                }
            })
            .addOnCompleteListener(task -> proxy.close());
    }

    private void handleRead(String[] result) {
        long now = System.currentTimeMillis();
        if (now - lastAcceptedAtMs < SAMPLE_INTERVAL_MS) {
            return;
        }
        lastAcceptedAtMs = now;

        String fingerprint = result[0] + "|" + result[1] + "|" + result[2];
        acceptedReads.add(fingerprint);
        if (acceptedReads.size() > REQUIRED_MATCHES) {
            acceptedReads.remove(0);
        }

        int count = acceptedReads.size();

        boolean allMatch = true;
        for (int i = 1; i < acceptedReads.size(); i++) {
            if (!acceptedReads.get(i).equals(acceptedReads.get(0))) {
                allMatch = false;
                break;
            }
        }

        if (!allMatch) {
            acceptedReads.clear();
            setHint(HINT_MISMATCH);
            return;
        }

        if (count < REQUIRED_MATCHES) {
            setHint(HINT_HOLD_STEADY);
            return;
        }

        found = true;
        Log.d(TAG, "MRZ confirmed after " + REQUIRED_MATCHES + " reads: " + result[0]);
        if (sCallback != null) sCallback.onMrzResult(result[0], result[1], result[2]);
        finish();
    }

    private void setHint(String text) {
        runOnUiThread(() -> hintText.setText(text));
    }

    @Override
    protected void onDestroy() {
        if (!found && sCallback != null) {
            sCallback.onMrzError("cancelled");
        }
        super.onDestroy();
        executor.shutdown();
    }

    /**
     * Scan guide overlay — layout matches {@code MrzDocumentSkeleton}; sample lines use
     * X/{@code <} placeholders only (readable example stays on {@code MrzScanScreen}).
     */
    private static final class MrzGuideOverlayView extends View {
        /** ISO/IEC 7810 ID-1 width:height (national ID / card-format documents). */
        private static final float CARD_ASPECT_RATIO = 85.6f / 53.98f;
        private static final String SAMPLE_MRZ_LINE1 = "X<XXXXXXXXXXX<<XXXX<XXXXX";
        private static final String SAMPLE_MRZ_LINE2_PREFIX = "XXXXXXXXX<XXXXXXXXXXXXXXXXXX";
        private static final String SAMPLE_MRZ_LINE2_SUFFIX = "XX";
        private static final char MRZ_FILLER = '<';
        private static final int MRZ_LINE_MAX_CHARS = 44;
        private static final String CHAR_WIDTH_PROBE = "<<<<<<<<<<";

        private final Paint scrimPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint cardStrokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint mrzBandPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final float cornerRadius;
        private final float strokeWidth;
        private final float contentPaddingH;

        MrzGuideOverlayView(Context context) {
            super(context);
            scrimPaint.setColor(0x26000000);

            strokeWidth = dp(context, 3);
            cornerRadius = dp(context, 22);
            contentPaddingH = dp(context, 14);

            cardStrokePaint.setStyle(Paint.Style.STROKE);
            cardStrokePaint.setStrokeWidth(strokeWidth);
            cardStrokePaint.setColor(0xF2FFFFFF);

            mrzBandPaint.setStyle(Paint.Style.FILL);
            mrzBandPaint.setColor(0x35FFFFFF);

            textPaint.setColor(0xCCFFFFFF);
            textPaint.setTypeface(Typeface.MONOSPACE);
            textPaint.setFakeBoldText(false);
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);

            float width = getWidth();
            float height = getHeight();
            canvas.drawRect(0, 0, width, height, scrimPaint);

            float cardWidth = width * 0.88f;
            float cardHeight = cardWidth / CARD_ASPECT_RATIO;
            float maxCardHeight = height * 0.30f;
            if (cardHeight > maxCardHeight) {
                cardHeight = maxCardHeight;
                cardWidth = cardHeight * CARD_ASPECT_RATIO;
            }
            float left = (width - cardWidth) / 2f;
            float top = (height - cardHeight) * 0.38f;
            RectF card = new RectF(left, top, left + cardWidth, top + cardHeight);

            canvas.drawRoundRect(card, cornerRadius, cornerRadius, cardStrokePaint);

            float bandHeight = card.height() * 0.28f;
            RectF mrzBand = new RectF(card.left, card.bottom - bandHeight, card.right, card.bottom);
            Path mrzBandPath = new Path();
            mrzBandPath.addRoundRect(
                mrzBand,
                new float[] {0, 0, 0, 0, cornerRadius, cornerRadius, cornerRadius, cornerRadius},
                Path.Direction.CW
            );
            canvas.drawPath(mrzBandPath, mrzBandPaint);

            float lineWidth = card.width() - (2f * contentPaddingH);
            float textLeft = card.left + contentPaddingH;

            float sampleFontSize = clamp(lineWidth * 0.044f, dp(getContext(), 9), dp(getContext(), 15));
            float sampleLineGap = clamp(lineWidth * 0.008f, dp(getContext(), 2), dp(getContext(), 5));

            textPaint.setTextSize(sampleFontSize);
            float charWidth = textPaint.measureText(CHAR_WIDTH_PROBE) / CHAR_WIDTH_PROBE.length();
            int targetChars = targetCharCount(lineWidth, charWidth);
            String line1 = buildMrzLine(SAMPLE_MRZ_LINE1, targetChars, "");
            String line2 = buildMrzLine(SAMPLE_MRZ_LINE2_PREFIX, targetChars, SAMPLE_MRZ_LINE2_SUFFIX);

            Paint.FontMetrics fm = textPaint.getFontMetrics();
            float lineHeight = fm.descent - fm.ascent;
            float textBlockHeight = (2f * lineHeight) + sampleLineGap;
            float padTop = (mrzBand.height() - textBlockHeight) / 2f;
            float line1Baseline = mrzBand.top + padTop - fm.ascent;
            float line2Baseline = line1Baseline + lineHeight + sampleLineGap;
            canvas.drawText(line1, textLeft, line1Baseline, textPaint);
            canvas.drawText(line2, textLeft, line2Baseline, textPaint);
        }

        private static int sampleMrzMinChars() {
            return Math.max(
                SAMPLE_MRZ_LINE1.length(),
                SAMPLE_MRZ_LINE2_PREFIX.length() + SAMPLE_MRZ_LINE2_SUFFIX.length()
            );
        }

        private static int targetCharCount(float lineWidth, float charWidth) {
            if (charWidth <= 0f) {
                return sampleMrzMinChars();
            }
            return Math.min(
                MRZ_LINE_MAX_CHARS,
                Math.max(sampleMrzMinChars(), (int) Math.floor(lineWidth / charWidth))
            );
        }

        private static String buildMrzLine(String prefix, int targetChars, String suffix) {
            int bodyLen = targetChars - suffix.length();
            StringBuilder body = new StringBuilder(
                prefix.length() >= bodyLen ? prefix.substring(0, bodyLen) : prefix
            );
            while (body.length() < bodyLen) {
                body.append(MRZ_FILLER);
            }
            return body + suffix;
        }

        private static float clamp(float value, float min, float max) {
            return Math.min(Math.max(value, min), max);
        }

        private static float dp(Context context, float value) {
            return TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value,
                context.getResources().getDisplayMetrics()
            );
        }
    }
}
