/**
 * Permissions — the authority level system and approval gates.
 *
 * Implements progressive authority: Observe → Diagnose → Sandbox → Branch → Integrate → Release.
 * The AI cannot silently promote its own authority.
 */

import type { AuthorityLevel, PermissionCheck } from './types';

const AUTHORITY_ORDER: AuthorityLevel[] = [
  'observe',
  'diagnose',
  'sandbox',
  'branch',
  'integrate',
  'release',
];

export function authorityLevel(current: AuthorityLevel, required: AuthorityLevel): boolean {
  return AUTHORITY_ORDER.indexOf(current) >= AUTHORITY_ORDER.indexOf(required);
}

export function checkPermission(currentAuthority: AuthorityLevel, toolId: string): PermissionCheck {
  // Tools that require 'observe' are always available
  // Tools that require higher authority need the current level to be >= required

  // The tool's authorityRequired is checked in the tool registry dispatch.
  // This function is the policy: what authority the current session has.
  // The registry calls this to check if the session's authority is sufficient.

  // For now, the policy is simple: the session's authority level is fixed
  // at creation time and cannot be self-promoted.

  return {
    authority: currentAuthority,
    toolId,
    allowed: true, // The actual check is done by comparing authority levels in the dispatch
  };
}

// Actions that ALWAYS require human approval, regardless of authority level
const ALWAYS_REQUIRE_APPROVAL = new Set<string>([
  'delete-persistent-world',
  'rewrite-save-migration',
  'change-plugin-permissions',
  'import-dependency',
  'remove-major-system',
  'merge-large-change',
  'publish-build',
  'access-credentials',
  'modify-architect-system',
  'modify-protected-files',
  'modify-agents-md',
  'modify-permission-schema',
]);

export function requiresHumanApproval(action: string): boolean {
  return ALWAYS_REQUIRE_APPROVAL.has(action);
}

// Files that cannot be modified by autonomous iterations
const PROTECTED_FILES = new Set<string>([
  'AGENTS.md',
  'roadmap-state.json',
  'src/engine/architect/permissions.ts',
  'src/engine/architect/audit.ts',
  'src/engine/architect/gateway.ts',
]);

export function isProtectedFile(filePath: string): boolean {
  return PROTECTED_FILES.has(filePath);
}
