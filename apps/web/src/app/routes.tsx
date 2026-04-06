import { Navigate, Route, Routes as RouterRoutes } from 'react-router-dom';

import AdminLayout from '@/components/layouts/admin-layout';
import CompanyLayout from '@/components/layouts/company-layout';
import EmployeeLayout from '@/components/layouts/employee-layout';

import { generateModuleRoutes } from './routes/generate-module-routes';
import {
  AccountSettingsPage,
  AdminDashboard,
  AdminEmailConfigPage,
  AppearanceSettingsPage,
  CompaniesListPage,
  CompanyDashboard,
  CompanyEmailConfigPage,
  CompanyModulesListPage,
  CompanyModulesPage,
  CompanyProfilePage,
  EmployeeDashboard,
  EmployeePermissionsPage,
  EmployeesListPage,
  LoginPage,
  ModulesListPage,
  NotificationsArchivePage,
  NotificationSettingsPage,
  NotificationsInboxPage,
  UserEmailConfigPage,
  UsersListPage,
} from './routes/lazy-imports';
import {
  ADMIN_ROLES,
  EMPLOYEE_OWNER_ROLES,
  LazyRoute,
  ModuleAccessDenied,
  NotFound,
  OWNER_ROLES,
  ProtectedRoute,
  Unauthorized,
} from './routes/route-utils';

export default function Routes() {
  return (
    <RouterRoutes>
      <Route
        path="/login"
        element={
          <LazyRoute>
            <LoginPage />
          </LazyRoute>
        }
      />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/module-access-denied" element={<ModuleAccessDenied />} />

      {/* ==================== Admin Routes ==================== */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={ADMIN_ROLES}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyRoute>
              <AdminDashboard />
            </LazyRoute>
          }
        />
        <Route
          path="users"
          element={
            <LazyRoute>
              <UsersListPage />
            </LazyRoute>
          }
        />
        <Route
          path="companies"
          element={
            <LazyRoute>
              <CompaniesListPage />
            </LazyRoute>
          }
        />
        <Route
          path="companies/:id/modules"
          element={
            <LazyRoute>
              <CompanyModulesPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules"
          element={
            <LazyRoute>
              <ModulesListPage />
            </LazyRoute>
          }
        />
        <Route
          path="email-config"
          element={
            <LazyRoute>
              <AdminEmailConfigPage />
            </LazyRoute>
          }
        />

        {/* Module routes — generated from module-route-config.ts */}
        {generateModuleRoutes('admin', 'modules/')}
      </Route>

      {/* ==================== Company Owner Routes ==================== */}
      <Route
        path="/company/*"
        element={
          <ProtectedRoute allowedRoles={OWNER_ROLES}>
            <CompanyLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyRoute>
              <CompanyDashboard />
            </LazyRoute>
          }
        />
        <Route
          path="employees"
          element={
            <LazyRoute>
              <EmployeesListPage />
            </LazyRoute>
          }
        />
        <Route
          path="employees/:id/permissions"
          element={
            <LazyRoute>
              <EmployeePermissionsPage />
            </LazyRoute>
          }
        />
        <Route
          path="modules"
          element={
            <LazyRoute>
              <CompanyModulesListPage />
            </LazyRoute>
          }
        />
        <Route
          path="profile"
          element={
            <LazyRoute>
              <CompanyProfilePage />
            </LazyRoute>
          }
        />
        <Route
          path="email-config"
          element={
            <LazyRoute>
              <CompanyEmailConfigPage />
            </LazyRoute>
          }
        />

        {/* Module routes — generated from module-route-config.ts */}
        {generateModuleRoutes('company', 'modules/')}
      </Route>

      {/* ==================== Employee / Module Routes ==================== */}
      <Route
        path="/modules/*"
        element={
          <ProtectedRoute allowedRoles={EMPLOYEE_OWNER_ROLES}>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyRoute>
              <EmployeeDashboard />
            </LazyRoute>
          }
        />

        {/* Module routes — generated from module-route-config.ts */}
        {generateModuleRoutes('employee', '')}
      </Route>

      {/* ==================== Settings Routes ==================== */}
      <Route
        path="/settings/*"
        element={
          <ProtectedRoute>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="email-config"
          element={
            <LazyRoute>
              <UserEmailConfigPage />
            </LazyRoute>
          }
        />
        <Route
          path="account"
          element={
            <LazyRoute>
              <AccountSettingsPage />
            </LazyRoute>
          }
        />
        <Route
          path="appearance"
          element={
            <LazyRoute>
              <AppearanceSettingsPage />
            </LazyRoute>
          }
        />
      </Route>

      {/* ==================== Notifications Routes ==================== */}
      <Route
        path="/notifications/*"
        element={
          <ProtectedRoute>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyRoute>
              <NotificationsInboxPage />
            </LazyRoute>
          }
        />
        <Route
          path="archive"
          element={
            <LazyRoute>
              <NotificationsArchivePage />
            </LazyRoute>
          }
        />
        <Route
          path="settings"
          element={
            <LazyRoute>
              <NotificationSettingsPage />
            </LazyRoute>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
}
