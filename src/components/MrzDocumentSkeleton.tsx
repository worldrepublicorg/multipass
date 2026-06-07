import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, type LayoutChangeEvent} from 'react-native';

import {colors} from './common/styles';
import {mrzTextStyle} from '../theme/fonts';

/** ISO/IEC 7810 ID-1 width:height (national ID / card-format documents). */
const CARD_ASPECT_RATIO = 85.6 / 53.98;
/** TD3 line 1 — document type + name (fillers only after the name). */
const SAMPLE_MRZ_LINE1 = 'P<UTOERIKSSON<<ANNA<MARIA';
/**
 * TD3 line 2 — doc number, checks, nationality, DOB, sex, expiry (fillers before final check digits).
 * Placeholders align with add-ID hints (900115 / 300115 / F).
 */
const SAMPLE_MRZ_LINE2_PREFIX = 'AB1234567<9UTO9001151F3001159';
/** Composite + line check digits (always numeric at end of line 2). */
const SAMPLE_MRZ_LINE2_SUFFIX = '48';
const MRZ_FILLER = '<';
/** TD3 MRZ line length (44 per line). */
const MRZ_LINE_MAX_CHARS = 44;
const CHAR_WIDTH_PROBE = MRZ_FILLER.repeat(10);

const SAMPLE_MRZ_MIN_CHARS = Math.max(
  SAMPLE_MRZ_LINE1.length,
  SAMPLE_MRZ_LINE2_PREFIX.length + SAMPLE_MRZ_LINE2_SUFFIX.length,
);

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function targetCharCount(lineWidth: number, charWidth: number): number {
  if (charWidth <= 0) {
    return SAMPLE_MRZ_MIN_CHARS;
  }
  return Math.min(
    MRZ_LINE_MAX_CHARS,
    Math.max(SAMPLE_MRZ_MIN_CHARS, Math.floor(lineWidth / charWidth)),
  );
}

function buildMrzLine(
  prefix: string,
  targetChars: number,
  suffix = '',
): string {
  const bodyLen = targetChars - suffix.length;
  const body =
    prefix.length >= bodyLen
      ? prefix.slice(0, bodyLen)
      : prefix.padEnd(bodyLen, MRZ_FILLER);
  return body + suffix;
}

function SampleMrzLines({
  lineWidth,
  fontSize,
  lineGap,
}: {
  lineWidth: number;
  fontSize: number;
  lineGap: number;
}) {
  const [charWidth, setCharWidth] = useState(0);

  const targetChars = useMemo(
    () => targetCharCount(lineWidth, charWidth),
    [lineWidth, charWidth],
  );

  const line1 = useMemo(
    () => buildMrzLine(SAMPLE_MRZ_LINE1, targetChars),
    [targetChars],
  );
  const line2 = useMemo(
    () =>
      buildMrzLine(
        SAMPLE_MRZ_LINE2_PREFIX,
        targetChars,
        SAMPLE_MRZ_LINE2_SUFFIX,
      ),
    [targetChars],
  );

  const textStyle = useMemo(() => [styles.sampleMrz, {fontSize}], [fontSize]);

  useEffect(() => {
    setCharWidth(0);
  }, [lineWidth, fontSize]);

  return (
    <View style={[styles.sampleMrzWrap, {width: lineWidth, gap: lineGap}]}>
      {charWidth === 0 ? (
        <Text
          style={[textStyle, styles.sampleMrzMeasure]}
          numberOfLines={1}
          onLayout={event => {
            const measured = event.nativeEvent.layout.width;
            if (measured > 0) {
              setCharWidth(measured / CHAR_WIDTH_PROBE.length);
            }
          }}>
          {CHAR_WIDTH_PROBE}
        </Text>
      ) : null}
      <Text style={textStyle} numberOfLines={1}>
        {line1}
      </Text>
      <Text style={textStyle} numberOfLines={1}>
        {line2}
      </Text>
    </View>
  );
}

/** ID card outline with MRZ band — matches the in-camera scan guide overlay. */
export function MrzDocumentSkeleton() {
  const [lineWidth, setLineWidth] = useState(0);

  const onBandLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && width !== lineWidth) {
      setLineWidth(width);
    }
  };

  const fontSize = clamp(lineWidth * 0.044, 9, 15);
  const lineGap = clamp(lineWidth * 0.008, 2, 5);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.cardBody} />
        <View style={styles.mrzBand}>
          <View style={styles.mrzLines} onLayout={onBandLayout}>
            {lineWidth > 0 ? (
              <SampleMrzLines
                lineWidth={lineWidth}
                fontSize={fontSize}
                lineGap={lineGap}
              />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDark,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  cardBody: {
    flex: 18,
    backgroundColor: colors.surface,
  },
  mrzBand: {
    flex: 7,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  mrzLines: {
    width: '100%',
    alignItems: 'center',
  },
  sampleMrzWrap: {
    flexDirection: 'column',
  },
  sampleMrz: {
    ...mrzTextStyle(),
    color: colors.textMuted,
    opacity: 0.85,
  },
  sampleMrzMeasure: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
  },
});
