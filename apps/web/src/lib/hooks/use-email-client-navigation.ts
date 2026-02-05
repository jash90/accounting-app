import { useMemo } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook to get the base path for email client routes.
 * Handles /admin/modules/email-client, /company/modules/email-client and /modules/email-client paths.
 */
export function useEmailClientBasePath() {
  const location = useLocation();

  return useMemo(() => {
    // Extract base path: /admin/modules/email-client, /company/modules/email-client or /modules/email-client
    const match = location.pathname.match(/^(\/admin|\/company)?\/modules\/email-client/);
    return match ? match[0] : '/modules/email-client';
  }, [location.pathname]);
}

/**
 * Hook providing navigation functions and path builders for email client.
 * Automatically handles different route prefixes (company vs employee).
 */
export function useEmailClientNavigation() {
  const basePath = useEmailClientBasePath();
  const navigate = useNavigate();

  return useMemo(
    () => ({
      // Navigation functions
      toInbox: () => navigate(`${basePath}/inbox`),
      toCompose: (state?: object) => navigate(`${basePath}/compose`, { state }),
      toComposeWithQuery: (query: string, options?: { replace?: boolean }) =>
        navigate(`${basePath}/compose?${query}`, options),
      toDrafts: () => navigate(`${basePath}/drafts`),
      toSent: () => navigate(`${basePath}/sent`),
      toTrash: () => navigate(`${basePath}/trash`),
      toMessage: (uid: number) => navigate(`${basePath}/message/${uid}`),
      toFolder: (folderName: string) =>
        navigate(`${basePath}/folder/${encodeURIComponent(folderName)}`),

      // Path getters for Link components
      getMessagePath: (uid: number) => `${basePath}/message/${uid}`,
      getComposePath: (query?: string) =>
        query ? `${basePath}/compose?${query}` : `${basePath}/compose`,
      getInboxPath: () => `${basePath}/inbox`,
      getDraftsPath: () => `${basePath}/drafts`,
      getSentPath: () => `${basePath}/sent`,
      getTrashPath: () => `${basePath}/trash`,
      getFolderPath: (folderName: string) => `${basePath}/folder/${encodeURIComponent(folderName)}`,

      // Base path for custom usage
      basePath,
    }),
    [basePath, navigate]
  );
}
