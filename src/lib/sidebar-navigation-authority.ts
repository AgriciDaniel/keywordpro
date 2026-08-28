export type SidebarNavigationKind =
  | 'article'
  | 'new-article'
  | 'project-data'
  | 'project-gallery'
  | 'settings'
  | 'other';

export interface SidebarNavigationIntentInput {
  articleId?: string | null;
  kind: SidebarNavigationKind;
  projectId?: string | null;
  reason: string;
  url: string;
}

export interface SidebarNavigationIntent extends SidebarNavigationIntentInput {
  createdAt: number;
  seq: number;
}

export interface SidebarNavigationAuthority {
  claim: (input: SidebarNavigationIntentInput) => SidebarNavigationIntent;
  clearIfCurrent: (seq: number) => void;
  getCurrent: () => SidebarNavigationIntent | null;
  isCurrent: (seq: number) => boolean;
  shouldCorrectArticleRoute: (input: {
    articleId: string;
    observedArticleId: string | null;
    seq: number;
  }) => boolean;
}

export function createSidebarNavigationAuthority(): SidebarNavigationAuthority {
  let seq = 0;
  let current: SidebarNavigationIntent | null = null;

  return {
    claim(input) {
      seq += 1;
      current = {
        ...input,
        createdAt: Date.now(),
        seq,
      };
      return current;
    },
    clearIfCurrent(intentSeq) {
      if (current?.seq === intentSeq) {
        current = null;
      }
    },
    getCurrent() {
      return current;
    },
    isCurrent(intentSeq) {
      return current?.seq === intentSeq;
    },
    shouldCorrectArticleRoute({ articleId, observedArticleId, seq: intentSeq }) {
      return (
        current?.seq === intentSeq &&
        current.kind === 'article' &&
        current.articleId === articleId &&
        observedArticleId !== articleId
      );
    },
  };
}
