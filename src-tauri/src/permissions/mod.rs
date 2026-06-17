pub mod middleware;

use serde::{Deserialize, Serialize};

/// Explicit Enum-Based Permission System.
/// Prevents naive role-checking string bugs and allows dynamic role assignment.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Permission {
    ManageMembers,
    ManageFinances,
    ManageSystem,
    ViewReports,
    ManageTrainers,
    ManageOwnProfile,
}

/// Centralized Authorization Guard.
/// Evaluates if a given role template satisfies the explicitly requested Permission.
pub fn has_permission(role: &str, permission: &Permission) -> bool {
    match role {
        "SUPER_ADMIN" => true,
        "ADMIN" => !matches!(permission, Permission::ManageSystem), // Admin does everything except Core System
        "RECEPTIONIST" => matches!(permission, Permission::ManageMembers | Permission::ManageOwnProfile),
        "ACCOUNTANT" => matches!(permission, Permission::ManageFinances | Permission::ViewReports | Permission::ManageOwnProfile),
        "TRAINER" => matches!(permission, Permission::ViewReports | Permission::ManageOwnProfile),
        _ => false,
    }
}
