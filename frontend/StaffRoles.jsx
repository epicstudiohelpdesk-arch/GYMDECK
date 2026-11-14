import BrandFooter from "./BrandFooter.jsx";
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ShieldCheck,
  Shield,
  Search,
  List,
  Grid3X3,
  Check,
  Minus,
  ChevronRight,
  Key,
  Info,
} from "lucide-react";

// Role and permission reference. The grants below mirror the desktop
// authorization guard in src-tauri/src/permissions/mod.rs exactly.

const PERMISSIONS = [
  { id: "ManageMembers", label: "Manage Members", description: "Create and update member records." },
  { id: "ManageFinances", label: "Manage Finances", description: "Payments, billing and financial records." },
  { id: "ManageSystem", label: "Manage System", description: "System-level controls and configuration." },
  { id: "ViewReports", label: "View Reports", description: "Analytics, reports and performance data." },
  { id: "ManageTrainers", label: "Manage Trainers", description: "Trainer roster and staff assignments." },
  { id: "ManageOwnProfile", label: "Manage Own Profile", description: "Edit the signed-in user's own profile." },
];

const PERMISSION_MAP = Object.fromEntries(PERMISSIONS.map((p) => [p.id, p]));

const ROLE_TEMPLATES = [
  {
    id: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Unrestricted access to every permission in the desktop permission set.",
    permissions: ["ManageMembers", "ManageFinances", "ManageSystem", "ViewReports", "ManageTrainers", "ManageOwnProfile"],
    accent: { icon: "bg-indigo-50 text-indigo-600", dot: "bg-indigo-500" },
  },
  {
    id: "ADMIN",
    name: "Administrator",
    description: "Every permission except system-level management.",
    permissions: ["ManageMembers", "ManageFinances", "ViewReports", "ManageTrainers", "ManageOwnProfile"],
    accent: { icon: "bg-violet-50 text-violet-600", dot: "bg-violet-500" },
  },
  {
    id: "RECEPTIONIST",
    name: "Receptionist",
    description: "Front-desk access to member records and personal profile settings.",
    permissions: ["ManageMembers", "ManageOwnProfile"],
    accent: { icon: "bg-sky-50 text-sky-600", dot: "bg-sky-500" },
  },
  {
    id: "ACCOUNTANT",
    name: "Accountant",
    description: "Financial operations and reporting; member and trainer management are not granted.",
    permissions: ["ManageFinances", "ViewReports", "ManageOwnProfile"],
    accent: { icon: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  },
  {
    id: "TRAINER",
    name: "Trainer",
    description: "Reporting visibility plus self-service profile access.",
    permissions: ["ViewReports", "ManageOwnProfile"],
    accent: { icon: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  },
];

const hasPermission = (role, permissionId) => role.permissions.includes(permissionId);

const StatCard = ({ label, value, hint }) => (
  <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black leading-none tracking-tight text-slate-900">{value}</p>
    <p className="mt-2 text-[11px] font-medium leading-snug text-slate-500">{hint}</p>
  </article>
);

const AccessBadge = ({ fullAccess }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
      fullAccess ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${fullAccess ? "bg-indigo-500" : "bg-slate-400"}`} />
    {fullAccess ? "Full access" : "Scoped access"}
  </span>
);

const RoleCard = ({ role }) => {
  const fullAccess = role.permissions.length === PERMISSIONS.length;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${role.accent.icon}`}>
            {fullAccess ? <ShieldCheck size={19} /> : <Shield size={19} />}
          </span>
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900">{role.name}</h3>
            <p className="mt-1 font-mono text-[10px] font-semibold tracking-wide text-slate-400">{role.id}</p>
          </div>
        </div>
        <AccessBadge fullAccess={fullAccess} />
      </div>

      <p className="mt-4 text-xs font-medium leading-relaxed text-slate-500">{role.description}</p>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Granted permissions</h4>
          <span className="text-[10px] font-bold text-slate-500">
            {role.permissions.length} of {PERMISSIONS.length}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {role.permissions.map((permissionId) => (
            <li key={permissionId} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check size={11} strokeWidth={3} />
              </span>
              {PERMISSION_MAP[permissionId]?.label || permissionId}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};

const PermissionMatrix = ({ permissions }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <caption className="sr-only">Permissions granted to each desktop role template</caption>
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            <th scope="col" className="sticky left-0 z-10 bg-slate-50/95 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Permission
            </th>
            {ROLE_TEMPLATES.map((role) => (
              <th key={role.id} scope="col" className="px-4 py-4 text-center">
                <span className="block text-[11px] font-black text-slate-700">{role.name}</span>
                <span className="mt-0.5 block font-mono text-[9px] font-semibold tracking-wide text-slate-400">
                  {role.id}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {permissions.map((permission) => (
            <tr key={permission.id} className="group hover:bg-slate-50/60">
              <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-4 text-left group-hover:bg-slate-50/60">
                <span className="block text-xs font-bold text-slate-800">{permission.label}</span>
                <span className="mt-0.5 block text-[10px] font-medium text-slate-400">{permission.description}</span>
              </th>
              {ROLE_TEMPLATES.map((role) => {
                const granted = hasPermission(role, permission.id);
                return (
                  <td key={role.id} className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                        granted ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-300"
                      }`}
                      title={granted ? `${role.name}: granted` : `${role.name}: not granted`}
                    >
                      {granted ? <Check size={13} strokeWidth={3} /> : <Minus size={13} strokeWidth={3} />}
                      <span className="sr-only">{granted ? "Granted" : "Not granted"}</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3 text-[10px] font-semibold text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check size={10} strokeWidth={3} />
        </span>
        Granted
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-50 text-slate-300">
          <Minus size={10} strokeWidth={3} />
        </span>
        Not granted
      </span>
      <span className="ml-auto text-slate-400">Source: desktop permission guard</span>
    </div>
  </div>
);

const StaffRoles = () => {
  const [viewMode, setViewMode] = useState("roles");
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.trim().toLowerCase();

  const filteredRoles = useMemo(() => {
    if (!query) return ROLE_TEMPLATES;
    return ROLE_TEMPLATES.filter((role) =>
      [role.name, role.id, role.description, ...role.permissions.map((id) => PERMISSION_MAP[id]?.label || id)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [query]);

  const filteredPermissions = useMemo(() => {
    if (!query) return PERMISSIONS;
    return PERMISSIONS.filter((permission) =>
      [
        permission.label,
        permission.description,
        ...ROLE_TEMPLATES.filter((role) => hasPermission(role, permission.id)).map((role) => role.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [query]);

  const fullAccessCount = ROLE_TEMPLATES.filter((role) => role.permissions.length === PERMISSIONS.length).length;

  return (
    <div className="staff-roles-shell font-sans text-slate-900">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>Trainers &amp; Staff</span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="font-bold text-slate-900">Staff Roles</span>
        </nav>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-80">
            <span className="sr-only">Search roles and permissions</span>
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search roles or permissions"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="View mode">
            <button
              type="button"
              aria-pressed={viewMode === "roles"}
              onClick={() => setViewMode("roles")}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                viewMode === "roles" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List size={13} />
              Roles
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "matrix"}
              onClick={() => setViewMode("matrix")}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                viewMode === "matrix" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Grid3X3 size={13} />
              Matrix
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black leading-none tracking-tight text-slate-900">Staff Roles</h1>
          <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-slate-500">
            Read-only reference for the role templates and permission grants recognised by the desktop authorization guard.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <Key size={12} className="text-indigo-500" />
          Role reference
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Role templates" value={ROLE_TEMPLATES.length} hint="Recognised by the desktop permission guard" />
        <StatCard label="Permissions" value={PERMISSIONS.length} hint="Distinct capabilities in the permission set" />
        <StatCard label="Full-access roles" value={fullAccessCount} hint="Roles granted every permission" />
        <StatCard label="Default decision" value="Deny" hint="Roles without an explicit grant receive no access" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:items-start">
        <section className="xl:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              {viewMode === "roles" ? "Role templates" : "Permission matrix"}
            </h2>
            <span className="text-[10px] font-bold text-slate-400">
              {viewMode === "roles"
                ? `${filteredRoles.length} of ${ROLE_TEMPLATES.length} roles`
                : `${filteredPermissions.length} of ${PERMISSIONS.length} permissions`}
            </span>
          </div>

          {viewMode === "roles" ? (
            filteredRoles.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredRoles.map((role) => (
                  <RoleCard key={role.id} role={role} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-14 text-center shadow-sm">
                <p className="text-sm font-bold text-slate-800">No roles match “{searchQuery}”</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Try a role name, identifier, or permission.</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                >
                  Clear search
                </button>
              </div>
            )
          ) : filteredPermissions.length > 0 ? (
            <PermissionMatrix permissions={filteredPermissions} />
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-14 text-center shadow-sm">
              <p className="text-sm font-bold text-slate-800">No permissions match “{searchQuery}”</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Try a permission name or a role that holds it.</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-4 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
              >
                Clear search
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-4 xl:col-span-4">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Evaluation rules</h2>
            <ol className="mt-4 space-y-4">
              {[
                "The guard receives the role stored on the signed-in staff account and the permission being requested.",
                "Access is granted only when the role template explicitly lists that permission.",
                "Roles without a matching grant are denied; there is no implicit elevation.",
              ].map((rule, index) => (
                <li key={rule} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                    {index + 1}
                  </span>
                  <p className="text-xs font-medium leading-relaxed text-slate-500">{rule}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Info size={16} />
              </span>
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Role assignment</h2>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                  A staff member&apos;s role is stored on their account in the encrypted local database. This page documents the
                  templates only; it does not create or edit staff accounts.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Permission catalog</h2>
            <ul className="mt-4 space-y-3">
              {PERMISSIONS.map((permission) => (
                <li key={permission.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
                    <Key size={9} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{permission.label}</p>
                    <p className="text-[10px] font-medium leading-snug text-slate-400">{permission.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export const mountStaffRoles = () => {
  const container = document.querySelector('[data-stage="staff-roles"]');
  if (!container) {
    console.error("GymDeck: StaffRoles container not found!");
    return null;
  }

  try {
    const root = createRoot(container);
    root.render(<><StaffRoles /><BrandFooter /></>);
    return root;
  } catch (err) {
    console.error("GymDeck: Critical mount failure in StaffRoles:", err);
    return null;
  }
};

export default StaffRoles;
