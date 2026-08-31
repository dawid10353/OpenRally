import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Cross-Platform File System & Module Resolution Integrity', () => {
  const srcRoot = path.resolve(__dirname, '../../..');

  function getFilesAndDirsRecursively(dir: string): { files: string[]; dirs: string[] } {
    let files: string[] = [];
    let dirs: string[] = [dir];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = getFilesAndDirsRecursively(fullPath);
        files = files.concat(sub.files);
        dirs = dirs.concat(sub.dirs);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return { files, dirs };
  }

  it('ensures no sibling files or directories have case-insensitive name collisions (Windows/macOS safety)', () => {
    const { dirs } = getFilesAndDirsRecursively(srcRoot);
    const conflicts: string[] = [];

    for (const dir of dirs) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const lowercaseNames = new Map<string, string>();

      for (const entry of entries) {
        const nameLower = entry.name.toLowerCase();
        const existing = lowercaseNames.get(nameLower);

        if (existing) {
          conflicts.push(
            `In ${path.relative(srcRoot, dir)}: "${entry.name}" collides case-insensitively with "${existing}"`,
          );
        } else {
          lowercaseNames.set(nameLower, entry.name);
        }
      }
    }

    expect(conflicts).toEqual([]);
  });

  it('ensures no file shares a base name with a sibling directory (prevents ambiguous module resolution)', () => {
    const { dirs } = getFilesAndDirsRecursively(srcRoot);
    const ambiguities: string[] = [];

    for (const dir of dirs) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const subDirNames = new Set(
        entries.filter((e) => e.isDirectory()).map((e) => e.name.toLowerCase()),
      );

      for (const entry of entries) {
        if (entry.isFile()) {
          const baseName = path.parse(entry.name).name.toLowerCase();
          if (subDirNames.has(baseName)) {
            ambiguities.push(
              `In ${path.relative(srcRoot, dir)}: file "${entry.name}" shares base name with sibling directory "${baseName}/" which causes ambiguous Vite/Node module resolution on Windows/macOS.`,
            );
          }
        }
      }
    }

    expect(ambiguities).toEqual([]);
  });
});
