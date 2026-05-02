import { Refine, Authenticated } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { Outlet, Navigate } from "react-router-dom";
import { Building2, Users, FileSignature, CheckSquare, Settings } from "lucide-react";
import {
  mockDataProvider,
  mockAuthProvider,
  notificationProvider,
  i18nProvider,
} from "./providers";
import { mujarradDataProvider } from "./providers/mujarrad-data-provider";
import { authProvider as mujarradAuthProvider } from "./providers/auth-provider";
import { PortalLayout } from "./layouts/PortalLayout";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const dataProvider = USE_MOCK ? mockDataProvider : mujarradDataProvider;
const authProviderInstance = USE_MOCK ? mockAuthProvider : mujarradAuthProvider;

export function PortalApp() {
  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider}
      authProvider={authProviderInstance}
      notificationProvider={notificationProvider}
      i18nProvider={i18nProvider}
      resources={[
        {
          name: "organizations",
          list: "/portal/organizations",
          create: "/portal/organizations/create",
          edit: "/portal/organizations/edit/:id",
          show: "/portal/organizations/:id",
          meta: { label: "Organizations", icon: <Building2 /> },
        },
        {
          name: "signing-requests",
          list: "/portal/signing",
          create: "/portal/signing/new",
          show: "/portal/signing/:id",
          meta: { label: "Documents", icon: <FileSignature /> },
        },
        { name: "signature-fields", meta: { hide: true } },
        { name: "signers", meta: { hide: true } },
        {
          name: "contacts",
          list: "/portal/contacts",
          create: "/portal/contacts/create",
          edit: "/portal/contacts/edit/:id",
          show: "/portal/contacts/:id",
          meta: { label: "Contacts", icon: <Users /> },
        },
        { name: "files", meta: { hide: true } },
        { name: "notes", meta: { hide: true } },
        { name: "activity-events", meta: { hide: true } },
        { name: "users", meta: { hide: true } },
        {
          name: "tasks",
          list: "/portal/tasks",
          create: "/portal/tasks/create",
          meta: { label: "Tasks", icon: <CheckSquare /> },
        },
        { name: "sla-rules", meta: { hide: true } },
        { name: "alerts", meta: { hide: true } },
      ]}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        reactQuery: {
          clientConfig: {
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          },
        },
      }}
    >
      <Outlet />
    </Refine>
  );
}

export function PortalAuthenticated() {
  return (
    <Authenticated
      key="portal-auth"
      fallback={<Navigate to="/portal/login" />}
    >
      <PortalLayout />
    </Authenticated>
  );
}
