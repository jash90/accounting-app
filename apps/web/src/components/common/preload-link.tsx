import { memo, useCallback } from 'react';

import { Link, type LinkProps } from 'react-router-dom';

import { prefetchRoute } from '@/lib/utils/prefetch';

/**
 * PreloadLink component - a Link that preloads route chunks on hover/focus.
 * Use this for frequently accessed navigation links to improve perceived performance.
 *
 * The component uses the prefetch utility to load route chunks before navigation,
 * reducing perceived latency when the user clicks the link.
 *
 * @example
 * <PreloadLink to="/modules/clients">Clients</PreloadLink>
 *
 * @example
 * // With className
 * <PreloadLink to="/modules/settlements/list" className="text-blue-500">
 *   View Settlements
 * </PreloadLink>
 */
export const PreloadLink = memo(function PreloadLink({
  to,
  children,
  onMouseEnter,
  onFocus,
  ...props
}: LinkProps) {
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (typeof to === 'string') {
        prefetchRoute(to);
      }
      onMouseEnter?.(e);
    },
    [to, onMouseEnter]
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLAnchorElement>) => {
      if (typeof to === 'string') {
        prefetchRoute(to);
      }
      onFocus?.(e);
    },
    [to, onFocus]
  );

  return (
    <Link to={to} onMouseEnter={handleMouseEnter} onFocus={handleFocus} {...props}>
      {children}
    </Link>
  );
});
