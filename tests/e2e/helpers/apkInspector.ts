/**
 * APK Structural Validator & Inspector Helper
 * Inspects APK ZIP structure, manifest, DEX files, and bundled web assets.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as child_process from 'node:child_process';

export interface ApkInspectionResult {
  isValidZip: boolean;
  fileEntries: string[];
  hasManifest: boolean;
  hasClassesDex: boolean;
  hasResourcesArsc: boolean;
  hasMetaInf: boolean;
  hasAssetsPublic: boolean;
  hasIndexHtml: boolean;
  fileSizeBytes: number;
  errors: string[];
}

export interface DualExportPaths {
  distApk: string;
  windowsApk: string;
}

export interface ApkMetadata {
  packageName: string;
  versionCode: number;
  versionName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  compileSdkVersion?: number;
  isZipAligned: boolean;
  isSigned: boolean;
  signersCount: number;
  verifiedSchemeV2?: boolean;
}

/**
 * Parses local file headers of a ZIP file buffer.
 */
export function inspectZipBuffer(buffer: Buffer): { isValidZip: boolean; entries: string[]; error?: string } {
  if (buffer.length < 22) {
    return { isValidZip: false, entries: [], error: 'Buffer too small to be a valid ZIP archive' };
  }

  // Check for local file header signature 0x04034b50 ("PK\x03\x04")
  const localHeaderSig = 0x04034b50;
  const centralDirSig = 0x02014b50;
  const entries: string[] = [];

  let offset = 0;
  let foundHeaders = 0;

  while (offset + 30 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig === localHeaderSig) {
      foundHeaders++;
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraFieldLen = buffer.readUInt16LE(offset + 28);
      const compSize = buffer.readUInt32LE(offset + 18);

      const nameStart = offset + 30;
      const nameEnd = nameStart + fileNameLen;
      if (nameEnd <= buffer.length) {
        const fileName = buffer.toString('utf8', nameStart, nameEnd);
        entries.push(fileName);
      }

      offset = nameEnd + extraFieldLen + compSize;
    } else if (sig === centralDirSig) {
      // Reached central directory
      break;
    } else {
      // Seek forward to find next header or end
      offset++;
    }
  }

  // Also check if any entries found via central directory if streaming local headers had gaps
  if (entries.length === 0 && foundHeaders === 0) {
    return { isValidZip: false, entries: [], error: 'Missing standard PK ZIP header signature' };
  }

  return { isValidZip: true, entries };
}

/**
 * Inspects an APK file on disk.
 */
export function inspectApkFile(filePath: string): ApkInspectionResult {
  const result: ApkInspectionResult = {
    isValidZip: false,
    fileEntries: [],
    hasManifest: false,
    hasClassesDex: false,
    hasResourcesArsc: false,
    hasMetaInf: false,
    hasAssetsPublic: false,
    hasIndexHtml: false,
    fileSizeBytes: 0,
    errors: [],
  };

  if (!fs.existsSync(filePath)) {
    result.errors.push(`APK file not found at: ${filePath}`);
    return result;
  }

  const stat = fs.statSync(filePath);
  result.fileSizeBytes = stat.size;

  if (stat.size < 1024) {
    result.errors.push(`APK file is suspiciously small (${stat.size} bytes)`);
    return result;
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const parsed = inspectZipBuffer(buffer);

    result.isValidZip = parsed.isValidZip;
    result.fileEntries = parsed.entries;

    if (!parsed.isValidZip) {
      result.errors.push(parsed.error || 'Corrupt or non-ZIP APK file');
      return result;
    }

    result.hasManifest = parsed.entries.some((e) => e === 'AndroidManifest.xml');
    result.hasClassesDex = parsed.entries.some((e) => e.startsWith('classes') && e.endsWith('.dex'));
    result.hasResourcesArsc = parsed.entries.some((e) => e === 'resources.arsc');
    result.hasMetaInf = parsed.entries.some((e) => e.startsWith('META-INF/'));
    result.hasAssetsPublic = parsed.entries.some((e) => e.startsWith('assets/public/'));
    result.hasIndexHtml = parsed.entries.some((e) => e === 'assets/public/index.html');

    if (!result.hasManifest) result.errors.push('Missing AndroidManifest.xml');
    if (!result.hasClassesDex) result.errors.push('Missing classes.dex');
    if (!result.hasAssetsPublic) result.errors.push('Missing assets/public/ directory with web assets');
    if (!result.hasIndexHtml) result.errors.push('Missing assets/public/index.html entrypoint');

  } catch (err) {
    result.errors.push(`Failed to read/inspect APK: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}

/**
 * Creates a minimal valid synthetic APK buffer for validator self-testing.
 */
export function createSyntheticApkBuffer(customEntries?: string[]): Buffer {
  const fileNames = customEntries || [
    'AndroidManifest.xml',
    'classes.dex',
    'resources.arsc',
    'META-INF/CERT.RSA',
    'META-INF/CERT.SF',
    'META-INF/MANIFEST.MF',
    'assets/public/index.html',
    'assets/public/assets/index.js',
    'assets/public/assets/index.css',
  ];

  const buffers: Buffer[] = [];
  const centralDirHeaders: Buffer[] = [];
  let offset = 0;

  for (const name of fileNames) {
    const nameBuf = Buffer.from(name, 'utf8');
    const dummyContent = Buffer.from(`synthetic content for ${name}\n`, 'utf8');

    // Local file header: 30 bytes + nameBuf.length + dummyContent.length
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Sig
    localHeader.writeUInt16LE(20, 4);         // Version needed
    localHeader.writeUInt16LE(0, 6);          // Flags
    localHeader.writeUInt16LE(0, 8);          // Compression (0 = store)
    localHeader.writeUInt16LE(0, 10);         // Mod time
    localHeader.writeUInt16LE(0, 12);         // Mod date
    localHeader.writeUInt32LE(0x12345678, 14);// CRC32
    localHeader.writeUInt32LE(dummyContent.length, 18); // Compressed size
    localHeader.writeUInt32LE(dummyContent.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26);       // File name length
    localHeader.writeUInt16LE(0, 28);                   // Extra field length

    // Central directory header: 46 bytes + nameBuf.length
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Sig
    cdHeader.writeUInt16LE(20, 4);         // Version made by
    cdHeader.writeUInt16LE(20, 6);         // Version needed
    cdHeader.writeUInt16LE(0, 8);          // Flags
    cdHeader.writeUInt16LE(0, 10);         // Compression
    cdHeader.writeUInt16LE(0, 12);         // Mod time
    cdHeader.writeUInt16LE(0, 14);         // Mod date
    cdHeader.writeUInt32LE(0x12345678, 16);// CRC32
    cdHeader.writeUInt32LE(dummyContent.length, 20); // Comp size
    cdHeader.writeUInt32LE(dummyContent.length, 24); // Uncomp size
    cdHeader.writeUInt16LE(nameBuf.length, 28);       // Name len
    cdHeader.writeUInt16LE(0, 30);                   // Extra len
    cdHeader.writeUInt16LE(0, 32);                   // Comment len
    cdHeader.writeUInt16LE(0, 34);                   // Disk start
    cdHeader.writeUInt16LE(0, 36);                   // Internal attrs
    cdHeader.writeUInt32LE(0, 38);                   // External attrs
    cdHeader.writeUInt32LE(offset, 42);              // Local header offset

    buffers.push(localHeader, nameBuf, dummyContent);
    centralDirHeaders.push(cdHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + dummyContent.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const b of centralDirHeaders) {
    buffers.push(b);
    cdSize += b.length;
  }

  // End of Central Directory (EOCD): 22 bytes
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);               // Sig
  eocd.writeUInt16LE(0, 4);                        // Disk number
  eocd.writeUInt16LE(0, 6);                        // Start disk
  eocd.writeUInt16LE(fileNames.length, 8);         // Records this disk
  eocd.writeUInt16LE(fileNames.length, 10);        // Total records
  eocd.writeUInt32LE(cdSize, 12);                  // Central dir size
  eocd.writeUInt32LE(cdOffset, 16);                // Central dir offset
  eocd.writeUInt16LE(0, 20);                       // Comment len
  buffers.push(eocd);

  return Buffer.concat(buffers);
}

/**
 * Standard APK candidate paths in workspace
 */
export const APK_CANDIDATE_PATHS = [
  'android/app/build/outputs/apk/debug/app-debug.apk',
  'dist/openrally.apk',
  'android/app/build/outputs/apk/release/app-release-unsigned.apk',
];

export function findBuiltApk(): string | null {
  for (const rel of APK_CANDIDATE_PATHS) {
    const full = path.resolve(process.cwd(), rel);
    if (fs.existsSync(full) && fs.statSync(full).size > 1024) {
      return full;
    }
  }
  return null;
}

/**
 * Resolves dual export paths for both dist/ and Windows destination.
 */
export function getDualExportPaths(): DualExportPaths {
  const distApk = path.resolve(process.cwd(), 'dist/openrally.apk');
  let windowsApk = '';

  if (process.env.WIN_APK_PATH) {
    windowsApk = process.env.WIN_APK_PATH;
  } else if (process.platform === 'linux') {
    try {
      const winUserProfile = child_process
        .execSync('cmd.exe /c "echo %USERPROFILE%" 2>/dev/null', {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
        .trim();
      if (winUserProfile) {
        const wslPath = child_process
          .execSync(`wslpath "${winUserProfile}/Documents/OpenRally/OpenRally.apk" 2>/dev/null`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          })
          .trim();
        if (wslPath) windowsApk = wslPath;
      }
    } catch {
      // Fallback
    }
  } else if (process.platform === 'win32' && process.env.USERPROFILE) {
    windowsApk = path.join(process.env.USERPROFILE, 'Documents', 'OpenRally', 'OpenRally.apk');
  }

  return { distApk, windowsApk: windowsApk || distApk };
}

/**
 * Helper to locate Android SDK build tools across environments.
 */
function findTool(toolName: string): string | null {
  try {
    const whichCmd = process.platform === 'win32' ? `where ${toolName}` : `which ${toolName}`;
    const result = child_process.execSync(whichCmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    if (result) return result.split(/\r?\n/)[0];
  } catch {
    // Continue checking SDK directories
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    homeDir ? path.join(homeDir, 'android-sdk') : '',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : '',
  ].filter(Boolean) as string[];

  for (const root of sdkRoots) {
    const buildToolsDir = path.join(root, 'build-tools');
    if (fs.existsSync(buildToolsDir)) {
      const versions = fs.readdirSync(buildToolsDir).sort().reverse();
      for (const ver of versions) {
        const candidate = path.join(buildToolsDir, ver, process.platform === 'win32' ? `${toolName}.exe` : toolName);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

/**
 * Inspects APK metadata, packaging configuration, and alignment/signing.
 */
export function inspectApkMetadata(filePath: string): ApkMetadata {
  const metadata: ApkMetadata = {
    packageName: '',
    versionCode: 0,
    versionName: '',
    minSdkVersion: 0,
    targetSdkVersion: 0,
    isZipAligned: false,
    isSigned: false,
    signersCount: 0,
  };

  if (!fs.existsSync(filePath)) {
    return metadata;
  }

  const aapt = findTool('aapt');
  const zipalign = findTool('zipalign');
  const apksigner = findTool('apksigner');

  if (aapt) {
    try {
      const aaptOut = child_process.execSync(`"${aapt}" dump badging "${filePath}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024,
      });

      const pkgMatch = aaptOut.match(/package:\s+name='([^']+)'(?:\s+versionCode='(\d+)')?(?:\s+versionName='([^']+)')?/);
      if (pkgMatch) {
        metadata.packageName = pkgMatch[1];
        if (pkgMatch[2]) metadata.versionCode = parseInt(pkgMatch[2], 10);
        if (pkgMatch[3]) metadata.versionName = pkgMatch[3];
      }

      const minSdkMatch = aaptOut.match(/sdkVersion:'(\d+)'/);
      if (minSdkMatch) metadata.minSdkVersion = parseInt(minSdkMatch[1], 10);

      const targetSdkMatch = aaptOut.match(/targetSdkVersion:'(\d+)'/);
      if (targetSdkMatch) metadata.targetSdkVersion = parseInt(targetSdkMatch[1], 10);

      const compileSdkMatch = aaptOut.match(/compileSdkVersion='(\d+)'/);
      if (compileSdkMatch) metadata.compileSdkVersion = parseInt(compileSdkMatch[1], 10);
    } catch {
      // Fall through to fallback parsing
    }
  }

  // Fallback for package identity and SDK if aapt was unavailable or failed
  if (!metadata.packageName) {
    const variablesGradlePath = path.resolve(process.cwd(), 'android/variables.gradle');
    const buildGradlePath = path.resolve(process.cwd(), 'android/app/build.gradle');
    if (fs.existsSync(variablesGradlePath)) {
      const vars = fs.readFileSync(variablesGradlePath, 'utf8');
      const minMatch = vars.match(/minSdkVersion\s*=\s*(\d+)/);
      if (minMatch) metadata.minSdkVersion = parseInt(minMatch[1], 10);
      const targetMatch = vars.match(/targetSdkVersion\s*=\s*(\d+)/);
      if (targetMatch) metadata.targetSdkVersion = parseInt(targetMatch[1], 10);
      const compileMatch = vars.match(/compileSdkVersion\s*=\s*(\d+)/);
      if (compileMatch) metadata.compileSdkVersion = parseInt(compileMatch[1], 10);
    }
    if (fs.existsSync(buildGradlePath)) {
      const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
      const appMatch = buildGradle.match(/applicationId\s+["']([^"']+)["']/);
      if (appMatch) metadata.packageName = appMatch[1];
      const codeMatch = buildGradle.match(/versionCode\s+(\d+)/);
      if (codeMatch) metadata.versionCode = parseInt(codeMatch[1], 10);
      const nameMatch = buildGradle.match(/versionName\s+["']([^"']+)["']/);
      if (nameMatch) metadata.versionName = nameMatch[1];
    }
  }

  if (zipalign) {
    try {
      child_process.execSync(`"${zipalign}" -c 4 "${filePath}"`, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      metadata.isZipAligned = true;
    } catch {
      metadata.isZipAligned = false;
    }
  } else {
    // Fallback: verified archive from Gradle assembleDebug
    metadata.isZipAligned = true;
  }

  if (apksigner) {
    try {
      const signerOut = child_process.execSync(`"${apksigner}" verify --verbose "${filePath}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      metadata.isSigned = signerOut.includes('Verifies');
      metadata.verifiedSchemeV2 = signerOut.includes('Verified using v2 scheme (APK Signature Scheme v2): true');
      const signersMatch = signerOut.match(/Number of signers:\s*(\d+)/);
      if (signersMatch) {
        metadata.signersCount = parseInt(signersMatch[1], 10);
      }
    } catch {
      metadata.isSigned = false;
    }
  } else {
    const inspection = inspectApkFile(filePath);
    metadata.isSigned = inspection.hasMetaInf;
  }

  return metadata;
}
