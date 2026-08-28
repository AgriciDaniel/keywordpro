'use client';

import { useEffect } from 'react';

const WORKSPACE_SELECTOR = '[data-slot="sidebar-inset"]';

export function WorkspaceCenterVars() {
  useEffect(() => {
    const root = document.documentElement;
    let frame: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const update = () => {
      frame = null;
      const workspace = document.querySelector<HTMLElement>(WORKSPACE_SELECTOR);
      if (!workspace) return;

      const rect = workspace.getBoundingClientRect();
      root.dataset.protectedWorkspace = 'true';
      root.style.setProperty('--workspace-left', `${rect.left}px`);
      root.style.setProperty('--workspace-right', `${rect.right}px`);
      root.style.setProperty('--workspace-width', `${rect.width}px`);
      root.style.setProperty(
        '--workspace-center-x',
        `${rect.left + rect.width / 2}px`
      );
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(update);
    };

    const bindWorkspaceObserver = () => {
      resizeObserver?.disconnect();
      const workspace = document.querySelector<HTMLElement>(WORKSPACE_SELECTOR);
      if (!workspace) return;
      resizeObserver = new ResizeObserver(schedule);
      resizeObserver.observe(workspace);
    };

    bindWorkspaceObserver();
    schedule();

    const mutationObserver = new MutationObserver(() => {
      bindWorkspaceObserver();
      schedule();
    });
    mutationObserver.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'data-state', 'data-collapsible', 'style'],
    });

    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.body.addEventListener('transitionend', schedule, true);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.body.removeEventListener('transitionend', schedule, true);
      delete root.dataset.protectedWorkspace;
      root.style.removeProperty('--workspace-left');
      root.style.removeProperty('--workspace-right');
      root.style.removeProperty('--workspace-width');
      root.style.removeProperty('--workspace-center-x');
    };
  }, []);

  return null;
}
