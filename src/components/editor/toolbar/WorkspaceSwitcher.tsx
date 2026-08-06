'use client';

/**
 * WorkspaceSwitcher
 * ==================
 *
 * Replaces 18 bottom-dock tabs as primary navigation with 8 coherent
 * workspaces. Mounted in the top bar.
 *
 * Workspaces: World, Assets, Characters, Animation, Simulation,
 * Architect, Playtest, Diagnostics
 *
 * Each workspace determines what shows in the left sidebar, center,
 * right sidebar, and which bottom dock tabs are available.
 */

import { useState, useCallback } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Globe, Package, Users, Clapperboard, Cpu,
  Sparkles, Gamepad2, Activity,
} from 'lucide-react';
import type { WorkspaceId } from '@/lib/studio-ui/action-registry';
import { WORKSPACES } from '@/lib/studio-ui/workspaces';

const WORKSPACE_ICONS: Record<string, typeof Globe> = {
  Globe,
  Package,
  Users,
  Clapperboard,
  Cpu,
  Sparkles,
  Gamepad2,
  Activity,
};

interface WorkspaceSwitcherProps {
  activeWorkspace: WorkspaceId;
  onWorkspaceChange: (ws: WorkspaceId) => void;
}

export function WorkspaceSwitcher({ activeWorkspace, onWorkspaceChange }: WorkspaceSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5" role="tablist" aria-label="Workspace switcher">
      {WORKSPACES.map((ws) => {
        const Icon = WORKSPACE_ICONS[ws.icon] ?? Globe;
        const isActive = activeWorkspace === ws.id;
        return (
          <Tooltip key={ws.id}>
            <TooltipTrigger asChild>
              <button
                role="tab"
                aria-selected={isActive}
                aria-label={ws.name}
                onClick={() => onWorkspaceChange(ws.id)}
                className={`flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-300'
                    : 'text-[#8888aa] hover:bg-[#1d1d36] hover:text-[#c8c8e0]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{ws.name}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              <div className="font-semibold">{ws.name}</div>
              <div className="mt-0.5 text-[10px] text-[#8888aa]">{ws.description}</div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
