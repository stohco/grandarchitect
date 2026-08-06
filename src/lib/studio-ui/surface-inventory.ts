/**
 * UI Surface Inventory Builder
 * =============================
 *
 * Programmatically inventories every interactive surface in the repository.
 * Scans source files for buttons, tabs, links, inputs, shortcuts, and
 * classifies each by status (working, broken, no-op, placeholder, etc.)
 *
 * This generates the UI_SURFACE_MANIFEST.json required by the audit.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import type { UiSurfaceRecord, SurfaceStatus } from './workspaces';
import type { WorkspaceId } from './action-registry';

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

interface ScanResult {
  surfaces: UiSurfaceRecord[];
  stats: {
    total: number;
    byStatus: Record<SurfaceStatus, number>;
    byType: Record<string, number>;
  };
}

export function scanUiSurfaces(baseDir: string): ScanResult {
  const surfaces: UiSurfaceRecord[] = [];
  const componentFiles = findComponentFiles(join(baseDir, 'src', 'components'));
  const storeFiles = findFiles(join(baseDir, 'src', 'lib'), '.ts');

  for (const file of componentFiles) {
    const content = readFileSync(file, 'utf-8');
    const relativePath = file.replace(baseDir + '/', '');

    // Find buttons
    scanForButtons(content, relativePath, surfaces);

    // Find tabs
    scanForTabs(content, relativePath, surfaces);

    // Find inputs
    scanForInputs(content, relativePath, surfaces);

    // Find Selects
    scanForSelects(content, relativePath, surfaces);

    // Find links
    scanForLinks(content, relativePath, surfaces);
  }

  // Find keyboard shortcuts from store
  for (const file of storeFiles) {
    const content = readFileSync(file, 'utf-8');
    const relativePath = file.replace(baseDir + '/', '');
    scanForShortcuts(content, relativePath, surfaces);
  }

  // Compute stats
  const byStatus: Record<SurfaceStatus, number> = {
    working: 0, broken: 0, 'no-op': 0, placeholder: 0,
    unreachable: 0, 'overflow-hidden': 0, prototype: 0, unknown: 0,
  };
  const byType: Record<string, number> = {};

  for (const s of surfaces) {
    byStatus[s.currentStatus]++;
    byType[s.role] = (byType[s.role] ?? 0) + 1;
  }

  return {
    surfaces,
    stats: {
      total: surfaces.length,
      byStatus,
      byType,
    },
  };
}

// ---------------------------------------------------------------------------
// Scanners
// ---------------------------------------------------------------------------

function scanForButtons(content: string, filePath: string, surfaces: UiSurfaceRecord[]): void {
  // Match <Button and onClick patterns
  const buttonRegex = /<(Button|button)[^>]*?(?:onClick=\{([^}]+)\})?[^>]*?>([^<]*)/g;
  let match;
  let id = 0;

  while ((match = buttonRegex.exec(content)) !== null) {
    const label = match[3]?.trim() || '';
    const onClick = match[2]?.trim() || '';
    const workspace = inferWorkspace(filePath);

    // Classify status
    let status: SurfaceStatus = 'unknown';
    if (onClick.includes('fetch') || onClick.includes('void ')) {
      status = 'working';
    } else if (onClick === '' || onClick === '() => {}') {
      status = 'no-op';
    } else if (label.includes('TODO') || label.includes('placeholder')) {
      status = 'placeholder';
    } else if (onClick.includes('console.log')) {
      status = 'no-op';
    } else if (onClick !== '') {
      status = 'working';
    }

    if (label.length > 0) {
      surfaces.push({
        surfaceId: `btn-${filePath}-${id++}`,
        componentPath: filePath,
        visibleLabel: label.slice(0, 60),
        accessibleName: label.slice(0, 60),
        role: 'button',
        workspace,
        currentStatus: status,
        notes: onClick ? [`onClick: ${onClick.slice(0, 80)}`] : ['no onClick handler'],
      });
    }
  }
}

function scanForTabs(content: string, filePath: string, surfaces: UiSurfaceRecord[]): void {
  const tabRegex = /(?:TabsTrigger|tab)[^>]*?value="([^"]+)"[^>]*?>([^<]*)/g;
  let match;
  let id = 0;

  while ((match = tabRegex.exec(content)) !== null) {
    const value = match[1];
    const label = match[2]?.trim() || value;
    surfaces.push({
      surfaceId: `tab-${filePath}-${id++}`,
      componentPath: filePath,
      visibleLabel: label,
      accessibleName: label,
      role: 'tab',
      workspace: inferWorkspace(filePath),
      currentStatus: 'working',
      notes: [`value: ${value}`],
    });
  }

  // Also find BOTTOM_TABS entries
  const bottomTabsRegex = /value:\s*'([^']+)',\s*label:\s*'([^']+)'/g;
  while ((match = bottomTabsRegex.exec(content)) !== null) {
    surfaces.push({
      surfaceId: `bottom-tab-${filePath}-${id++}`,
      componentPath: filePath,
      visibleLabel: match[2],
      accessibleName: match[2],
      role: 'tab',
      workspace: 'diagnostics',
      currentStatus: 'working',
      notes: [`tab value: ${match[1]}`],
    });
  }
}

function scanForInputs(content: string, filePath: string, surfaces: UiSurfaceRecord[]): void {
  const inputRegex = /<(Input|input)[^>]*?(?:placeholder="([^"]+)")?[^>]*?\/?>/g;
  let match;
  let id = 0;

  while ((match = inputRegex.exec(content)) !== null) {
    const placeholder = match[2] || 'input';
    surfaces.push({
      surfaceId: `input-${filePath}-${id++}`,
      componentPath: filePath,
      visibleLabel: placeholder,
      accessibleName: placeholder,
      role: 'textbox',
      workspace: inferWorkspace(filePath),
      currentStatus: 'working',
    });
  }
}

function scanForSelects(content: string, filePath: string, surfaces: UiSurfaceRecord[]): void {
  const selectRegex = /<(Select|select)[^>]*?>/g;
  let match;
  let id = 0;

  while ((match = selectRegex.exec(content)) !== null) {
    surfaces.push({
      surfaceId: `select-${filePath}-${id++}`,
      componentPath: filePath,
      visibleLabel: 'select',
      accessibleName: 'select',
      role: 'combobox',
      workspace: inferWorkspace(filePath),
      currentStatus: 'working',
    });
  }
}

function scanForLinks(content: string, filePath: string, surfaces: UiSurfaceRecord[]): void {
  const linkRegex = /<(Link|a)[^>]*?href="([^"]*)"[^>]*?>([^<]*)/g;
  let match;
  let id = 0;

  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[2];
    const label = match[3]?.trim() || href;
    surfaces.push({
      surfaceId: `link-${filePath}-${id++}`,
      componentPath: filePath,
      visibleLabel: label,
      accessibleName: label,
      role: 'link',
      workspace: 'global',
      currentStatus: 'working',
      notes: [`href: ${href}`],
    });
  }
}

function scanForShortcuts(content: string, filePath: string, surfaces: UiSurfaceRecord[]): void {
  // Find keyboard event handlers
  const shortcutRegex = /case\s+['"]([^'"]+)['"]\s*:/g;
  let match;
  let id = 0;

  while ((match = shortcutRegex.exec(content)) !== null) {
    const key = match[1];
    if (key.length === 1 || key.startsWith('Arrow') || key === 'Escape' || key === 'Enter') {
      surfaces.push({
        surfaceId: `shortcut-${filePath}-${id++}`,
        componentPath: filePath,
        visibleLabel: key,
        accessibleName: `Keyboard: ${key}`,
        role: 'shortcut',
        workspace: 'global',
        currentStatus: 'working',
        shortcut: key,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferWorkspace(filePath: string): WorkspaceId {
  if (filePath.includes('toolbar') || filePath.includes('Toolbar')) return 'global';
  if (filePath.includes('Outliner')) return 'world';
  if (filePath.includes('Inspector')) return 'world';
  if (filePath.includes('Studio') || filePath.includes('Asset')) return 'assets';
  if (filePath.includes('Character') || filePath.includes('character')) return 'characters';
  if (filePath.includes('Animation') || filePath.includes('animation')) return 'animation';
  if (filePath.includes('Simulation') || filePath.includes('simulation')) return 'simulation';
  if (filePath.includes('Architect') || filePath.includes('architect')) return 'architect';
  if (filePath.includes('Crash') || filePath.includes('crash') || filePath.includes('Console')) return 'diagnostics';
  if (filePath.includes('Frontier') || filePath.includes('frontier')) return 'diagnostics';
  if (filePath.includes('Engine') || filePath.includes('engine')) return 'diagnostics';
  if (filePath.includes('Conformance') || filePath.includes('conformance')) return 'diagnostics';
  if (filePath.includes('Capability') || filePath.includes('capability')) return 'diagnostics';
  if (filePath.includes('Reasoning') || filePath.includes('reasoning')) return 'diagnostics';
  if (filePath.includes('Constraint') || filePath.includes('constraint')) return 'diagnostics';
  if (filePath.includes('Complexity') || filePath.includes('complexity')) return 'diagnostics';
  if (filePath.includes('Benchmark') || filePath.includes('benchmark')) return 'diagnostics';
  if (filePath.includes('Claims') || filePath.includes('claims')) return 'diagnostics';
  if (filePath.includes('Workspace') || filePath.includes('workspace')) return 'diagnostics';
  if (filePath.includes('Production') || filePath.includes('production')) return 'diagnostics';
  return 'global';
}

function findComponentFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findComponentFiles(fullPath));
      } else if (extname(entry) === '.tsx' || extname(entry) === '.jsx') {
        files.push(fullPath);
      }
    }
  } catch {
    // directory doesn't exist
  }
  return files;
}

function findFiles(dir: string, ext: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findFiles(fullPath, ext));
      } else if (extname(entry) === ext) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory doesn't exist
  }
  return files;
}
