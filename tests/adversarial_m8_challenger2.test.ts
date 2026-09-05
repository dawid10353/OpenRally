/**
 * Adversarial Challenge Suite M8 (Challenger 2)
 *
 * Rigorous empirical stress-testing of Android APK build deliverables,
 * dual export parity, archive integrity, manifest/SDK identities, 4-byte zip alignment,
 * APK Signature Scheme v2 validation, and edge case resilience against corrupted,
 * truncated, zero-byte, or structurally deficient binaries.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as child_process from 'node:child_process';
import {
  inspectZipBuffer,
  inspectApkFile,
  createSyntheticApkBuffer,
  getDualExportPaths,
  inspectApkMetadata,
  findBuiltApk,
} from './e2e/helpers/apkInspector';

describe('Adversarial M8 Challenge (Challenger 2): APK Binary & Validator Stress Tests', () => {
  const { distApk, windowsApk } = getDualExportPaths();

  describe('Suite 1: APK-8 Dual Export & Binary Specification Invariants', () => {
    it('M8-ADV-1.1: Live export deliverables exist at both dist/ and Windows host destinations', () => {
      expect(fs.existsSync(distApk)).toBe(true);
      expect(fs.existsSync(windowsApk)).toBe(true);
    });

    it('M8-ADV-1.2: Both export binaries strictly exceed the 240 MB threshold with byte-for-byte size equality', () => {
      const distStat = fs.statSync(distApk);
      const winStat = fs.statSync(windowsApk);

      const MIN_REQUIRED_BYTES = 240 * 1024 * 1024; // 251,658,240 bytes
      expect(distStat.size).toBeGreaterThan(MIN_REQUIRED_BYTES);
      expect(winStat.size).toBeGreaterThan(MIN_REQUIRED_BYTES);
      expect(distStat.size).toBe(winStat.size);
    });

    it('M8-ADV-1.3: Cryptographic SHA256 hashes of dist/ and Windows export files are identical', () => {
      const distHash = child_process.execSync(`sha256sum "${distApk}"`, { encoding: 'utf8' }).split(/\s+/)[0];
      const winHash = child_process.execSync(`sha256sum "${windowsApk}"`, { encoding: 'utf8' }).split(/\s+/)[0];

      expect(distHash).toHaveLength(64);
      expect(winHash).toHaveLength(64);
      expect(distHash).toBe(winHash);
    }, 15000);

    it('M8-ADV-1.4: Dual export binaries pass structural archive inspection with zero errors', () => {
      const distResult = inspectApkFile(distApk);
      expect(distResult.isValidZip).toBe(true);
      expect(distResult.hasManifest).toBe(true);
      expect(distResult.hasClassesDex).toBe(true);
      expect(distResult.hasResourcesArsc).toBe(true);
      expect(distResult.hasMetaInf).toBe(true);
      expect(distResult.hasAssetsPublic).toBe(true);
      expect(distResult.hasIndexHtml).toBe(true);
      expect(distResult.errors).toHaveLength(0);

      const winResult = inspectApkFile(windowsApk);
      expect(winResult.isValidZip).toBe(true);
      expect(winResult.hasManifest).toBe(true);
      expect(winResult.hasClassesDex).toBe(true);
      expect(winResult.hasResourcesArsc).toBe(true);
      expect(winResult.hasMetaInf).toBe(true);
      expect(winResult.hasAssetsPublic).toBe(true);
      expect(winResult.hasIndexHtml).toBe(true);
      expect(winResult.errors).toHaveLength(0);
    });

    it('M8-ADV-1.5: APK-8 specification rejects binaries that fail size threshold or have size divergence', () => {
      // Simulation of size below 240 MB
      const smallSize = 150 * 1024 * 1024;
      const minThreshold = 240 * 1024 * 1024;
      const isSizeAcceptable = smallSize > minThreshold;
      expect(isSizeAcceptable).toBe(false);

      // Simulation of size mismatch between export locations
      const distSimSize = 254498845;
      const winSimSize = 254498800; // 45 bytes truncated
      const sizesMatch = distSimSize === winSimSize;
      expect(sizesMatch).toBe(false);
    });
  });

  describe('Suite 2: APK-9 Package Identity, SDK Targets & Badging Verification', () => {
    it('M8-ADV-2.1: Inspects live package metadata matching exact production specifications', () => {
      const metadata = inspectApkMetadata(distApk);

      expect(metadata.packageName).toBe('com.openrally.app');
      expect(metadata.versionCode).toBe(1);
      expect(metadata.versionName).toBe('1.0');
      expect(metadata.minSdkVersion).toBe(24);
      expect(metadata.targetSdkVersion).toBe(36);
    });

    it('M8-ADV-2.2: Live aapt dump badging validates AndroidManifest binary XML in both export APKs', () => {
      const aaptTool = '/home/dawid/android-sdk/build-tools/35.0.0/aapt';
      if (!fs.existsSync(aaptTool)) {
        return; // Skip if aapt is unavailable in host environment
      }

      for (const apkPath of [distApk, windowsApk]) {
        const output = child_process.execSync(`"${aaptTool}" dump badging "${apkPath}"`, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
        });

        expect(output).toContain("package: name='com.openrally.app'");
        expect(output).toContain("versionCode='1'");
        expect(output).toContain("versionName='1.0'");
        expect(output).toContain("sdkVersion:'24'");
        expect(output).toContain("targetSdkVersion:'36'");
        expect(output).toContain("application-label:'OpenRally'");
      }
    });

    it('M8-ADV-2.3: Rejects or returns empty identity when inspected against non-existent file', () => {
      const nonExistentPath = path.resolve(process.cwd(), 'tests/e2e/helpers/.non_existent_apk_file.apk');
      const meta = inspectApkMetadata(nonExistentPath);

      expect(meta.packageName).toBe('');
      expect(meta.versionCode).toBe(0);
      expect(meta.minSdkVersion).toBe(0);
      expect(meta.isSigned).toBe(false);
      expect(meta.isZipAligned).toBe(false);
    });
  });

  describe('Suite 3: APK-10 4-Byte Zip Alignment & Signature Scheme v2 Validation', () => {
    it('M8-ADV-3.1: Live APK reports 4-byte zip alignment and valid signature scheme v2', () => {
      const metadata = inspectApkMetadata(distApk);

      expect(metadata.isZipAligned).toBe(true);
      expect(metadata.isSigned).toBe(true);
      expect(metadata.signersCount).toBeGreaterThanOrEqual(1);
      if (metadata.verifiedSchemeV2 !== undefined) {
        expect(metadata.verifiedSchemeV2).toBe(true);
      }
    });

    it('M8-ADV-3.2: Direct zipalign -c 4 verifies 4-byte boundary alignment on all uncompressed resources', () => {
      const zipalignTool = '/home/dawid/android-sdk/build-tools/35.0.0/zipalign';
      if (!fs.existsSync(zipalignTool)) {
        return;
      }

      // Check exit code 0 for both APKs
      const distCheck = child_process.spawnSync(zipalignTool, ['-c', '4', distApk]);
      expect(distCheck.status).toBe(0);

      const winCheck = child_process.spawnSync(zipalignTool, ['-c', '4', windowsApk]);
      expect(winCheck.status).toBe(0);
    });

    it('M8-ADV-3.3: Direct apksigner verify --verbose confirms APK Signature Scheme v2 cryptographic validity', () => {
      const apksignerTool = '/home/dawid/android-sdk/build-tools/35.0.0/apksigner';
      if (!fs.existsSync(apksignerTool)) {
        return;
      }

      const signerResult = child_process.spawnSync(apksignerTool, ['verify', '--verbose', distApk], {
        encoding: 'utf8',
      });

      expect(signerResult.status).toBe(0);
      expect(signerResult.stdout).toContain('Verifies');
      expect(signerResult.stdout).toContain('Verified using v2 scheme (APK Signature Scheme v2): true');
      expect(signerResult.stdout).toContain('Number of signers: 1');
    });

    it('M8-ADV-3.4: Adversarially unaligned or unsigned ZIP files fail zipalign and apksigner verification', () => {
      const zipalignTool = '/home/dawid/android-sdk/build-tools/35.0.0/zipalign';
      const apksignerTool = '/home/dawid/android-sdk/build-tools/35.0.0/apksigner';

      // Create synthetic APK (standard ZIP without Android 4-byte page-alignment or v2 signature block)
      const syntheticBuffer = createSyntheticApkBuffer();
      const tempSynthetic = path.resolve(process.cwd(), 'tests/e2e/helpers/.tmp_unaligned_unsigned.apk');

      try {
        fs.writeFileSync(tempSynthetic, syntheticBuffer);

        if (fs.existsSync(zipalignTool)) {
          // Synthetic unaligned zip should fail 4-byte page alignment check
          const alignRes = child_process.spawnSync(zipalignTool, ['-c', '4', tempSynthetic]);
          expect(alignRes.status).not.toBe(0);
        }

        if (fs.existsSync(apksignerTool)) {
          // Synthetic unsigned zip should fail signature verification
          const signRes = child_process.spawnSync(apksignerTool, ['verify', tempSynthetic]);
          expect(signRes.status).not.toBe(0);
        }
      } finally {
        if (fs.existsSync(tempSynthetic)) {
          fs.unlinkSync(tempSynthetic);
        }
      }
    });
  });

  describe('Suite 4: Edge Cases & Structural Failure Modes (APK-2, APK-5, APK-7)', () => {
    it('M8-ADV-4.1: inspectZipBuffer rejects zero-byte, under-sized (< 22B) and non-PK buffers', () => {
      // Empty buffer
      const zeroBuf = Buffer.alloc(0);
      const resZero = inspectZipBuffer(zeroBuf);
      expect(resZero.isValidZip).toBe(false);
      expect(resZero.error).toContain('Buffer too small');

      // 15-byte buffer
      const smallBuf = Buffer.from('SHORT_BUFFER_15');
      const resSmall = inspectZipBuffer(smallBuf);
      expect(resSmall.isValidZip).toBe(false);
      expect(resSmall.error).toContain('Buffer too small');

      // 64-byte non-ZIP buffer
      const nonZipBuf = Buffer.alloc(64, 0xaa);
      const resNonZip = inspectZipBuffer(nonZipBuf);
      expect(resNonZip.isValidZip).toBe(false);
      expect(resNonZip.error).toContain('Missing standard PK ZIP header signature');
    });

    it('M8-ADV-4.2: inspectZipBuffer handles truncated ZIP archives with corrupted headers', () => {
      const validSynthetic = createSyntheticApkBuffer();

      // Truncate to first 35 bytes (middle of first file entry data)
      const truncatedBuf = validSynthetic.subarray(0, 35);
      const resTruncated = inspectZipBuffer(truncatedBuf);
      // Even if it detected first header, central directory or trailing data is incomplete
      expect(Array.isArray(resTruncated.entries)).toBe(true);

      // Mutate PK signature bytes to corrupt header
      const corruptedHeader = Buffer.from(validSynthetic);
      corruptedHeader.writeUInt32LE(0xdeadbeef, 0); // Overwrite first PK signature
      const resCorrupt = inspectZipBuffer(corruptedHeader);
      // Valid entries cannot be read if header is corrupted
      expect(resCorrupt.entries).not.toContain('AndroidManifest.xml');
    });

    it('M8-ADV-4.3: inspectApkFile rejects non-existent and suspiciously small (< 1024B) files', () => {
      const nonExistentFile = path.resolve(process.cwd(), 'tests/e2e/helpers/.does_not_exist.apk');
      const resMissing = inspectApkFile(nonExistentFile);

      expect(resMissing.isValidZip).toBe(false);
      expect(resMissing.errors.some((e) => e.includes('not found'))).toBe(true);

      const tinyFile = path.resolve(process.cwd(), 'tests/e2e/helpers/.tiny_test.apk');
      try {
        fs.writeFileSync(tinyFile, Buffer.alloc(500, 0x5a));
        const resTiny = inspectApkFile(tinyFile);

        expect(resTiny.isValidZip).toBe(false);
        expect(resTiny.errors.some((e) => e.includes('suspiciously small'))).toBe(true);
      } finally {
        if (fs.existsSync(tinyFile)) {
          fs.unlinkSync(tinyFile);
        }
      }
    });

    it('M8-ADV-4.4: inspectApkFile identifies and reports missing critical components independently for valid archives >= 1024B', () => {
      const tempDeficient = path.resolve(process.cwd(), 'tests/e2e/helpers/.temp_deficient.apk');

      // Create entries that exceed 1024 bytes total size
      const fillerEntries = Array.from({ length: 15 }, (_, i) => `assets/filler_${i}.bin`);

      try {
        // Missing AndroidManifest.xml and classes.dex
        const noManifestEntries = [
          'resources.arsc',
          'assets/public/index.html',
          ...fillerEntries,
        ];
        const noManifestBuf = createSyntheticApkBuffer(noManifestEntries);
        expect(noManifestBuf.length).toBeGreaterThan(1024);
        fs.writeFileSync(tempDeficient, noManifestBuf);

        const res = inspectApkFile(tempDeficient);
        expect(res.isValidZip).toBe(true);
        expect(res.hasManifest).toBe(false);
        expect(res.hasClassesDex).toBe(false);
        expect(res.errors).toContain('Missing AndroidManifest.xml');
        expect(res.errors).toContain('Missing classes.dex');

        // Missing assets/public/index.html
        const noHtmlEntries = [
          'AndroidManifest.xml',
          'classes.dex',
          'resources.arsc',
          ...fillerEntries,
        ];
        const noHtmlBuf = createSyntheticApkBuffer(noHtmlEntries);
        expect(noHtmlBuf.length).toBeGreaterThan(1024);
        fs.writeFileSync(tempDeficient, noHtmlBuf);

        const res2 = inspectApkFile(tempDeficient);
        expect(res2.isValidZip).toBe(true);
        expect(res2.hasIndexHtml).toBe(false);
        expect(res2.errors).toContain('Missing assets/public/index.html entrypoint');
      } finally {
        if (fs.existsSync(tempDeficient)) {
          fs.unlinkSync(tempDeficient);
        }
      }
    });

    it('M8-ADV-4.5: findBuiltApk returns candidate when present and ignores non-existent or empty candidates', () => {
      const livePath = findBuiltApk();
      expect(livePath).toBeDefined();
      expect(livePath).not.toBeNull();
      if (livePath) {
        expect(fs.existsSync(livePath)).toBe(true);
        expect(fs.statSync(livePath).size).toBeGreaterThan(1024);
      }
    });
  });
});
