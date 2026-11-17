/**
 * Local, per-gym persistence for Banking & Settlement accounts.
 *
 * Every query is scoped by `ctx.gym_id`, which is derived from the authenticated
 * desktop session (never supplied by the renderer). This guarantees that a gym
 * can only ever read or mutate its own payment destinations.
 *
 * The local SQLCipher database is the authoritative store for the desktop app so
 * banking details survive logout/login and work while the cloud is unreachable.
 */

use rusqlite::{params, Connection, Row};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::user::AuthenticatedContext;
use crate::repositories::sync_repo::SyncRepository;

fn row_to_dto(row: &Row<'_>) -> Result<Value, rusqlite::Error> {
    let last4: Option<String> = row.get("account_number_last4")?;
    let masked = last4.map(|v| format!("•••• •••• {}", v));

    Ok(json!({
        "id": row.get::<_, String>("id")?,
        "method": row.get::<_, String>("method")?,
        "label": row.get::<_, Option<String>>("label")?,
        "status": row.get::<_, String>("status")?,
        "isActive": row.get::<_, i64>("is_active")? != 0,
        "isPrimary": row.get::<_, i64>("is_primary")? != 0,
        "beneficiaryName": row.get::<_, String>("beneficiary_name")?,
        "upiVpa": row.get::<_, Option<String>>("upi_vpa")?,
        "bankName": row.get::<_, Option<String>>("bank_name")?,
        "accountType": row.get::<_, Option<String>>("account_type")?,
        "accountNumberMasked": masked,
        "ifscCode": row.get::<_, Option<String>>("ifsc_code")?,
        "branchName": row.get::<_, Option<String>>("branch_name")?,
        "branchCity": row.get::<_, Option<String>>("branch_city")?,
        "qrImageUrl": row.get::<_, Option<String>>("qr_image_url")?,
        "instructions": row.get::<_, Option<String>>("instructions")?,
        "createdAt": row.get::<_, String>("created_at")?,
        "updatedAt": row.get::<_, String>("updated_at")?,
    }))
}

fn as_opt_string(payload: &Value, key: &str) -> Option<String> {
    payload.get(key).and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

fn digits_only(value: &str) -> String {
    value.chars().filter(|c| c.is_ascii_digit()).collect()
}

/// Serialize the authoritative row for the outbox. Bank accounts include the raw
/// number so the cloud can encrypt it server-side; the local vault is SQLCipher.
fn sync_payload(mut dto: Value, account_number: Option<String>) -> String {
    if let Some(number) = account_number {
        if let Some(obj) = dto.as_object_mut() {
            obj.insert("accountNumber".into(), json!(number));
        }
    }
    serde_json::to_string(&dto).unwrap_or_else(|_| "{}".into())
}

fn enqueue_sync(
    tx: &rusqlite::Transaction<'_>,
    ctx: &AuthenticatedContext,
    id: &str,
    operation: &str,
    payload: &str,
) -> Result<(), AppError> {
    let entity_id = Uuid::parse_str(id).unwrap_or_default();
    SyncRepository::enqueue_outbox_event(
        tx, &ctx.gym_id, "payment_account", &entity_id, operation, payload,
    )?;
    Ok(())
}

pub struct PaymentAccountRepository;

impl PaymentAccountRepository {
    /// All receiving accounts belonging to the authenticated gym.
    pub fn list(conn: &Connection, ctx: &AuthenticatedContext) -> Result<Vec<Value>, AppError> {
        let mut stmt = conn
            .prepare(
                "SELECT * FROM gym_payment_accounts
                 WHERE gym_id = ?1
                 ORDER BY is_primary DESC, created_at ASC",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt
            .query_map(params![ctx.gym_id.to_string()], row_to_dto)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut accounts = Vec::new();
        for row in rows {
            accounts.push(row.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(accounts)
    }

    fn find_owned(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        id: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut stmt = conn
            .prepare(
                "SELECT * FROM gym_payment_accounts WHERE id = ?1 AND gym_id = ?2 LIMIT 1",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        let mut rows = stmt
            .query_map(params![id, ctx.gym_id.to_string()], row_to_dto)
            .map_err(|e| AppError::Database(e.to_string()))?;
        match rows.next() {
            Some(row) => Ok(Some(row.map_err(|e| AppError::Database(e.to_string()))?)),
            None => Ok(None),
        }
    }

    pub fn create(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        payload: &Value,
    ) -> Result<Value, AppError> {
        let method = payload
            .get("method")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if method != "UPI" && method != "BANK_TRANSFER" {
            return Err(AppError::Configuration("method must be UPI or BANK_TRANSFER.".into()));
        }

        let beneficiary = as_opt_string(payload, "beneficiaryName").unwrap_or_default();
        if beneficiary.chars().count() < 2 {
            return Err(AppError::Configuration("Beneficiary display name is required.".into()));
        }

        let upi_vpa = as_opt_string(payload, "upiVpa");
        let account_number_raw = as_opt_string(payload, "accountNumber").unwrap_or_default();
        let account_number = digits_only(&account_number_raw);
        let confirm_number = digits_only(
            &as_opt_string(payload, "confirmAccountNumber").unwrap_or_default(),
        );
        let ifsc = as_opt_string(payload, "ifscCode").map(|v| v.to_uppercase());

        if method == "UPI" {
            match &upi_vpa {
                Some(vpa) if vpa.contains('@') && !vpa.starts_with('@') && !vpa.ends_with('@') => {}
                _ => return Err(AppError::Configuration("A valid UPI ID (name@handle) is required.".into())),
            }
        } else {
            if account_number.len() < 9 || account_number.len() > 18 {
                return Err(AppError::Configuration("Account number must be 9-18 digits.".into()));
            }
            if !confirm_number.is_empty() && account_number != confirm_number {
                return Err(AppError::Configuration("Account number and confirmation do not match.".into()));
            }
            match &ifsc {
                Some(code) if code.len() == 11 => {}
                _ => return Err(AppError::Configuration("A valid 11-character IFSC code is required.".into())),
            }
        }

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let is_primary = payload.get("isPrimary").and_then(|v| v.as_bool()).unwrap_or(false);
        let last4 = if account_number.len() >= 4 {
            Some(account_number[account_number.len() - 4..].to_string())
        } else {
            None
        };

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        if is_primary {
            tx.execute(
                "UPDATE gym_payment_accounts SET is_primary = 0, updated_at = ?1
                 WHERE gym_id = ?2 AND method = ?3",
                params![now, ctx.gym_id.to_string(), method],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        }

        tx.execute(
            "INSERT INTO gym_payment_accounts (
                id, gym_id, method, label, status, is_active, is_primary, beneficiary_name,
                upi_vpa, bank_name, account_type, account_number, account_number_last4, ifsc_code,
                branch_name, branch_city, qr_image_url, instructions, created_by, updated_by,
                created_at, updated_at
             ) VALUES (?1,?2,?3,?4,'UNVERIFIED',1,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?17,?18,?18)",
            params![
                id,
                ctx.gym_id.to_string(),
                method,
                as_opt_string(payload, "label"),
                is_primary,
                beneficiary,
                upi_vpa,
                as_opt_string(payload, "bankName"),
                as_opt_string(payload, "accountType"),
                if method == "BANK_TRANSFER" { Some(account_number.clone()) } else { None },
                last4,
                ifsc,
                as_opt_string(payload, "branchName"),
                as_opt_string(payload, "branchCity"),
                as_opt_string(payload, "qrImageUrl"),
                as_opt_string(payload, "instructions"),
                ctx.user_id.to_string(),
                now,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        let dto = Self::find_owned(&tx, ctx, &id)?.ok_or(AppError::Database(
            "Failed to load created payment account.".into(),
        ))?;
        let payload = sync_payload(
            dto.clone(),
            if method == "BANK_TRANSFER" { Some(account_number.clone()) } else { None },
        );
        enqueue_sync(&tx, ctx, &id, "CREATE", &payload)?;
        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Ok(dto)
    }

    pub fn update(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        id: &str,
        payload: &Value,
    ) -> Result<Value, AppError> {
        let existing = Self::find_owned(conn, ctx, id)?
            .ok_or_else(|| AppError::Unauthorized)?;
        let method = existing.get("method").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let mut upi_vpa = existing.get("upiVpa").and_then(|v| v.as_str()).map(str::to_string);
        if payload.get("upiVpa").is_some() {
            let next = as_opt_string(payload, "upiVpa");
            if method == "UPI" && next.is_none() {
                return Err(AppError::Configuration("UPI ID cannot be empty.".into()));
            }
            if let Some(ref vpa) = next {
                if !vpa.contains('@') || vpa.starts_with('@') || vpa.ends_with('@') {
                    return Err(AppError::Configuration("Invalid UPI ID.".into()));
                }
            }
            upi_vpa = next;
        }

        let mut account_number: Option<String> = None;
        let mut last4: Option<String> = None;
        if method == "BANK_TRANSFER" {
            if let Some(raw) = as_opt_string(payload, "accountNumber") {
                let cleaned = digits_only(&raw);
                if cleaned.len() < 9 || cleaned.len() > 18 {
                    return Err(AppError::Configuration("Account number must be 9-18 digits.".into()));
                }
                let confirm = digits_only(
                    &as_opt_string(payload, "confirmAccountNumber").unwrap_or_default(),
                );
                if !confirm.is_empty() && cleaned != confirm {
                    return Err(AppError::Configuration("Account numbers do not match.".into()));
                }
                last4 = Some(cleaned[cleaned.len() - 4..].to_string());
                account_number = Some(cleaned);
            }
        }

        let ifsc = if method == "BANK_TRANSFER" {
            match as_opt_string(payload, "ifscCode") {
                Some(code) if code.len() != 11 => {
                    return Err(AppError::Configuration("Invalid IFSC code.".into()))
                }
                Some(code) => Some(code.to_uppercase()),
                None => existing.get("ifscCode").and_then(|v| v.as_str()).map(str::to_string),
            }
        } else {
            existing.get("ifscCode").and_then(|v| v.as_str()).map(str::to_string)
        };

        let is_active = payload.get("isActive").and_then(|v| v.as_bool());
        let is_primary = payload.get("isPrimary").and_then(|v| v.as_bool())
            .unwrap_or(existing.get("isPrimary").and_then(|v| v.as_bool()).unwrap_or(false));

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        if is_primary && is_active != Some(false) {
            tx.execute(
                "UPDATE gym_payment_accounts SET is_primary = 0, updated_at = ?1
                 WHERE gym_id = ?2 AND method = ?3 AND id <> ?4",
                params![now, ctx.gym_id.to_string(), method, id],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        }

        tx.execute(
            "UPDATE gym_payment_accounts SET
                label = COALESCE(?3, label),
                beneficiary_name = COALESCE(?4, beneficiary_name),
                upi_vpa = ?5,
                bank_name = COALESCE(?6, bank_name),
                account_type = COALESCE(?7, account_type),
                account_number = COALESCE(?8, account_number),
                account_number_last4 = COALESCE(?9, account_number_last4),
                ifsc_code = ?10,
                branch_name = COALESCE(?11, branch_name),
                branch_city = COALESCE(?12, branch_city),
                qr_image_url = COALESCE(?13, qr_image_url),
                instructions = COALESCE(?14, instructions),
                is_active = CASE WHEN ?15 IS NULL THEN is_active ELSE ?15 END,
                is_primary = CASE WHEN ?15 = 0 THEN 0 WHEN ?16 = 1 THEN 1 ELSE is_primary END,
                status = CASE WHEN ?15 = 0 THEN 'DISABLED' WHEN status = 'DISABLED' THEN 'UNVERIFIED' ELSE status END,
                updated_by = ?17,
                updated_at = ?18
             WHERE id = ?1 AND gym_id = ?2",
            params![
                id,
                ctx.gym_id.to_string(),
                as_opt_string(payload, "label"),
                as_opt_string(payload, "beneficiaryName"),
                upi_vpa,
                as_opt_string(payload, "bankName"),
                as_opt_string(payload, "accountType"),
                account_number.clone(),
                last4,
                ifsc,
                as_opt_string(payload, "branchName"),
                as_opt_string(payload, "branchCity"),
                as_opt_string(payload, "qrImageUrl"),
                as_opt_string(payload, "instructions"),
                is_active.map(|v| if v { 1i64 } else { 0i64 }),
                if is_primary { 1i64 } else { 0i64 },
                ctx.user_id.to_string(),
                now,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        let dto = Self::find_owned(&tx, ctx, id)?.ok_or(AppError::Database(
            "Failed to load updated payment account.".into(),
        ))?;
        let payload = sync_payload(dto.clone(), account_number.clone());
        enqueue_sync(&tx, ctx, id, "UPDATE", &payload)?;
        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Ok(dto)
    }

    pub fn set_primary(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        id: &str,
    ) -> Result<Value, AppError> {
        let existing = Self::find_owned(conn, ctx, id)?
            .ok_or_else(|| AppError::Unauthorized)?;
        if existing.get("isActive").and_then(|v| v.as_bool()) != Some(true) {
            return Err(AppError::Configuration("Cannot make an inactive account primary.".into()));
        }
        let method = existing.get("method").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        tx.execute(
            "UPDATE gym_payment_accounts SET is_primary = 0, updated_at = ?1
             WHERE gym_id = ?2 AND method = ?3 AND id <> ?4",
            params![now, ctx.gym_id.to_string(), method, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        tx.execute(
            "UPDATE gym_payment_accounts SET is_primary = 1, updated_by = ?3, updated_at = ?4
             WHERE id = ?1 AND gym_id = ?2",
            params![id, ctx.gym_id.to_string(), ctx.user_id.to_string(), now],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        // Mirror every affected row so cloud primary flags stay consistent.
        for account in Self::list(&tx, ctx)? {
            let aid = account["id"].as_str().unwrap_or("").to_string();
            let payload = sync_payload(account, None);
            enqueue_sync(&tx, ctx, &aid, "UPDATE", &payload)?;
        }
        let dto = Self::find_owned(&tx, ctx, id)?.ok_or(AppError::Database(
            "Failed to load primary payment account.".into(),
        ))?;
        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Ok(dto)
    }

    pub fn deactivate(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        id: &str,
    ) -> Result<Value, AppError> {
        let existing = Self::find_owned(conn, ctx, id)?
            .ok_or_else(|| AppError::Unauthorized)?;
        let now = chrono::Utc::now().to_rfc3339();
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        tx.execute(
            "UPDATE gym_payment_accounts
             SET is_active = 0, is_primary = 0, status = 'DISABLED',
                 updated_by = ?3, updated_at = ?4
             WHERE id = ?1 AND gym_id = ?2",
            params![id, ctx.gym_id.to_string(), ctx.user_id.to_string(), now],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        let mut dto = existing;
        if let Some(obj) = dto.as_object_mut() {
            obj.insert("isActive".into(), json!(false));
            obj.insert("isPrimary".into(), json!(false));
            obj.insert("status".into(), json!("DISABLED"));
        }
        let payload = sync_payload(dto.clone(), None);
        enqueue_sync(&tx, ctx, id, "UPDATE", &payload)?;
        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Ok(dto)
    }
}
