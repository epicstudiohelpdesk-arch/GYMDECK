use rusqlite::{Connection, Transaction};
use uuid::Uuid;
use crate::models::gym_business::MembershipPlan;
use crate::models::user::AuthenticatedContext;
use crate::errors::AppError;
use chrono::Utc;

pub struct PlanRepository;

impl PlanRepository {
    /// Fetches all active plans for the authenticated gym.
    pub fn get_plans(
        conn: &Connection, 
        ctx: &AuthenticatedContext
    ) -> Result<Vec<MembershipPlan>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT * FROM membership_plans 
             WHERE gym_id = ?1 AND deleted_at IS NULL
             ORDER BY created_at DESC"
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let plan_iter = stmt.query_map(
            [ctx.gym_id.to_string()],
            |row| {
                Ok(MembershipPlan {
                    id: Uuid::parse_str(&row.get::<_, String>("id")?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>("gym_id")?).unwrap_or_default(),
                    plan_name: row.get("plan_name")?,
                    duration_days: row.get("duration_days")?,
                    price: row.get("price")?,
                    description: row.get("description")?,
                    is_active: row.get("is_active")?,
                    created_by_user_id: Uuid::parse_str(&row.get::<_, String>("created_by_user_id")?).unwrap_or_default(),
                    updated_by_user_id: Uuid::parse_str(&row.get::<_, String>("updated_by_user_id")?).unwrap_or_default(),
                    created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("updated_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    deleted_at: row.get::<_, Option<String>>("deleted_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                })
            },
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let mut plans = Vec::new();
        for plan in plan_iter {
            plans.push(plan.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(plans)
    }

    /// Creates a new membership plan.
    pub fn create_plan(
        tx: &Transaction,
        ctx: &AuthenticatedContext,
        plan: &MembershipPlan
    ) -> Result<(), AppError> {
        tx.execute(
            "INSERT INTO membership_plans (
                id, gym_id, plan_name, duration_days, price, description, is_active,
                created_by_user_id, updated_by_user_id, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ON CONFLICT(id) DO UPDATE SET
                plan_name = excluded.plan_name,
                duration_days = excluded.duration_days,
                price = excluded.price,
                description = excluded.description,
                is_active = excluded.is_active,
                updated_by_user_id = excluded.updated_by_user_id,
                updated_at = excluded.updated_at",
            (
                plan.id.to_string(),
                ctx.gym_id.to_string(),
                &plan.plan_name,
                plan.duration_days,
                plan.price,
                &plan.description,
                plan.is_active,
                ctx.user_id.to_string(),
                ctx.user_id.to_string(),
                Utc::now().to_rfc3339(),
                Utc::now().to_rfc3339(),
            ),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    /// Permanently deletes a membership plan.
    pub fn delete_plan(
        tx: &Transaction,
        ctx: &AuthenticatedContext,
        plan_id: &str,
    ) -> Result<(), AppError> {
        tx.execute(
            "DELETE FROM membership_plans WHERE id = ?1 AND gym_id = ?2",
            (plan_id, ctx.gym_id.to_string()),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }
}
