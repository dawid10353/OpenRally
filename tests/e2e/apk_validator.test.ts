/**
 * Android APK Structural Validator Test Suite
 * Automated verification of APK archive integrity, manifest configuration,
 * DEX bytecode presence, bundled web assets under assets/public/, dual export,
 * package metadata, and alignment/signing.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  inspectZipBuffer,
  inspectApkFile,
  createSyntheticApkBuffer,
  findBuiltApk,
  APK_CANDIDATE_PATHS,
  getDualExportPaths,
  inspectApkMetadata,
} from './helpers/apkInspector';

describe('Android APK Structural Validator', () => {
  describe('Archive Format & Signature Validation', () => {
    it('APK-1: Validates standard PK ZIP header signatures (0x04034b50)', () => {
      const validBuffer = createSyntheticApkBuffer();
      const result = inspectZipBuffer(validBuffer);

      expect(result.isValidZip).toBe(true);
      expect(result.entries.length).toBeGreaterThan(0);
    });

    it('APK-2: Detects corrupted or truncated APK archives', () => {
      const corruptBuffer = Buffer.from('NOT_A_VALID_ZIP_FILE_AT_ALL');
      const result = inspectZipBuffer(corruptBuffer);

      expect(result.isValidZip).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Package Structure & Asset Completeness', () => {
    it('APK-3: Verifies required Android runtime components (classes.dex, AndroidManifest.xml, resources.arsc)', () => {
      const syntheticApk = createSyntheticApkBuffer();
      const result = inspectZipBuffer(syntheticApk);

      const hasManifest = result.entries.includes('AndroidManifest.xml');
      const hasClassesDex = result.entries.some((e) => e.startsWith('classes') && e.endsWith('.dex'));
      const hasResources = result.entries.includes('resources.arsc');
      const hasSignatures = result.entries.some((e) => e.startsWith('META-INF/'));

      expect(hasManifest).toBe(true);
      expect(hasClassesDex).toBe(true);
      expect(hasResources).toBe(true);
      expect(hasSignatures).toBe(true);
    });

    it('APK-4: Verifies bundled web assets are housed under assets/public/ with index.html', () => {
      const syntheticApk = createSyntheticApkBuffer();
      const result = inspectZipBuffer(syntheticApk);

      const hasPublicIndex = result.entries.includes('assets/public/index.html');
      const hasPublicAssets = result.entries.some((e) => e.startsWith('assets/public/assets/'));

      expect(hasPublicIndex).toBe(true);
      expect(hasPublicAssets).toBe(true);
    });

    it('APK-5: Rejects APK packages missing critical runtime elements', () => {
      const incompleteEntries = [
        'resources.arsc',
        'assets/public/index.html',
      ];
      const incompleteBuffer = createSyntheticApkBuffer(incompleteEntries);
      const result = inspectZipBuffer(incompleteBuffer);

      const hasManifest = result.entries.includes('AndroidManifest.xml');
      const hasClassesDex = result.entries.some((e) => e.startsWith('classes') && e.endsWith('.dex'));

      expect(hasManifest).toBe(false);
      expect(hasClassesDex).toBe(false);
    });
  });

  describe('Live APK Binary Verification (Post-M4 Build)', () => {
    it('APK-6: Inspects live APK binary if present in workspace output folders', () => {
      const builtApkPath = findBuiltApk();

      if (builtApkPath) {
        // When M4 has generated the APK binary
        const liveResult = inspectApkFile(builtApkPath);

        expect(liveResult.isValidZip).toBe(true);
        expect(liveResult.hasManifest).toBe(true);
        expect(liveResult.hasClassesDex).toBe(true);
        expect(liveResult.hasAssetsPublic).toBe(true);
        expect(liveResult.hasIndexHtml).toBe(true);
        expect(liveResult.fileSizeBytes).toBeGreaterThan(1024 * 1024); // > 1 MB
        expect(liveResult.errors).toHaveLength(0);
      } else {
        // Prior to M4 build completion, verify designated output paths contract
        expect(APK_CANDIDATE_PATHS).toContain('android/app/build/outputs/apk/debug/app-debug.apk');
        expect(APK_CANDIDATE_PATHS).toContain('dist/openrally.apk');

        // Verify that candidate directories are resolvable
        for (const candidate of APK_CANDIDATE_PATHS) {
          const resolved = path.resolve(process.cwd(), candidate);
          expect(typeof resolved).toBe('string');
        }
      }
    });

    it('APK-7: Verifies inspection logic rejects 0-byte or corrupt files on disk', () => {
      const tempCorruptFile = path.resolve(process.cwd(), 'tests/e2e/helpers/.tmp_corrupt.apk');
      fs.writeFileSync(tempCorruptFile, Buffer.from('corrupt data'));

      try {
        const result = inspectApkFile(tempCorruptFile);
        expect(result.isValidZip).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      } finally {
        if (fs.existsSync(tempCorruptFile)) {
          fs.unlinkSync(tempCorruptFile);
        }
      }
    });
  });

  describe('Milestone M8 Dual Export & Identity Verification', () => {
    it('APK-8: Verifies dual export destinations exist and match valid APK binary specifications', () => {
      const { distApk, windowsApk } = getDualExportPaths();

      expect(fs.existsSync(distApk)).toBe(true);
      expect(fs.existsSync(windowsApk)).toBe(true);

      const distStat = fs.statSync(distApk);
      const winStat = fs.statSync(windowsApk);

      // Both must exceed 240 MB
      expect(distStat.size).toBeGreaterThan(240 * 1024 * 1024);
      expect(winStat.size).toBeGreaterThan(240 * 1024 * 1024);
      expect(distStat.size).toBe(winStat.size);

      // Both must inspect cleanly
      const distResult = inspectApkFile(distApk);
      expect(distResult.isValidZip).toBe(true);
      expect(distResult.hasManifest).toBe(true);
      expect(distResult.hasClassesDex).toBe(true);
      expect(distResult.hasAssetsPublic).toBe(true);
      expect(distResult.hasIndexHtml).toBe(true);
      expect(distResult.errors).toHaveLength(0);

      const winResult = inspectApkFile(windowsApk);
      expect(winResult.isValidZip).toBe(true);
      expect(winResult.hasManifest).toBe(true);
      expect(winResult.hasClassesDex).toBe(true);
      expect(winResult.hasAssetsPublic).toBe(true);
      expect(winResult.hasIndexHtml).toBe(true);
      expect(winResult.errors).toHaveLength(0);
    }, 20000);

    it('APK-9: Verifies Android package identity, versioning, and SDK targets', () => {
      const builtApkPath = findBuiltApk();
      expect(builtApkPath).toBeDefined();
      expect(builtApkPath).not.toBeNull();

      const metadata = inspectApkMetadata(builtApkPath!);

      expect(metadata.packageName).toBe('com.openrally.app');
      expect(metadata.versionCode).toBe(1);
      expect(metadata.versionName).toBe('1.0');
      expect(metadata.minSdkVersion).toBe(24);
      expect(metadata.targetSdkVersion).toBe(36);
    });

    it('APK-10: Verifies 4-byte zip alignment and signature verification', () => {
      const builtApkPath = findBuiltApk();
      expect(builtApkPath).toBeDefined();
      expect(builtApkPath).not.toBeNull();

      const metadata = inspectApkMetadata(builtApkPath!);

      expect(metadata.isZipAligned).toBe(true);
      expect(metadata.isSigned).toBe(true);
      if (metadata.verifiedSchemeV2 !== undefined) {
        expect(metadata.verifiedSchemeV2).toBe(true);
      }
    });
  });
});
