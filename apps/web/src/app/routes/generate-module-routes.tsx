/**
 * Route generator — converts declarative ModuleRouteConfig into React Router <Route> elements.
 * Used by routes.tsx to DRY up admin, company, and employee route groups.
 */
import type { ReactNode } from 'react';

import { Route } from 'react-router-dom';

import { MODULE_ROUTES, type LayoutType } from './module-route-config';
import { LazyRoute } from './route-utils';

/**
 * Generate <Route> elements for all modules applicable to the given layout.
 *
 * @param layout - Which layout group: 'admin', 'company', or 'employee'
 * @param prefix - Path prefix before module paths. Admin/Company use 'modules/', Employee uses ''
 */
export function generateModuleRoutes(layout: LayoutType, prefix: string): ReactNode {
  return MODULE_ROUTES.flatMap((module) => {
    const applicableRoutes = module.routes.filter(
      (route) => !route.layouts || route.layouts.includes(layout)
    );

    return applicableRoutes.map((route) => {
      const fullPath = route.path
        ? `${prefix}${module.path}/${route.path}`
        : `${prefix}${module.path}`;

      // Use component + path as key. For index routes with different components per layout,
      // the layout param differentiates them.
      const key = `${layout}-${fullPath}`;
      const Component = route.component;

      return (
        <Route
          key={key}
          path={fullPath}
          element={
            <LazyRoute>
              <Component />
            </LazyRoute>
          }
        />
      );
    });
  });
}
