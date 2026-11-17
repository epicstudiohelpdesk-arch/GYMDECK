use rusqlite::Transaction;
use serde_json::Value;
use uuid::Uuid;

use crate::errors::AppError;
use crate::repositories::sync_repo::RemoteChangeRecord;

/// Apply a cloud-originated receiving-account change inside the pull transaction.
pub fn apply_payment_account_pull(
    tx: &Transaction,
    gym_id: &Uuid,
    change: &RemoteChangeRecord,
) -> Result<(), AppError> {
    let p: &Value = &change.payload;
    let now = chrono::Utc::now().to_rfc3339();
    let id = change.entity_id.to_string();
    let gid = gym_id.to_string();

    if change.operation == "DELETE" {
        tx.execute(
            "UPDATE gym_payment_accounts SET is_active = 0, is_primary = 0,
                status = 'DISABLED', updated_at = ?1
             WHERE id = ?2 AND gym_id = ?3",
            rusqlite::params![now, id, gid],
        )
        .map_err(|e| AppError::Database(format!("Failed to delete payment account: {}", e)))?;
        return Ok(());
    }
    apply_upsert(tx, p, now, id, gid)
}

fn apply_upsert(
    tx: &Transaction,
    p: &Value,
    now: String,
    id: String,
    gid: String,
) -> Result<(), AppError> {
    let field = |name: &str| p.get(name).and_then(|v| v.as_str());
    let method = field("method").unwrap_or("UPI");
    let beneficiary = field("beneficiaryName").unwrap_or("Beneficiary");
    let masked = field("accountNumberMasked").unwrap_or("");
    let last4 = field("accountNumberLast4").map(str::to_string).or_else(|| {
        let digits: String = masked.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits.len() >= 4 { Some(digits[digits.len() - 4..].to_string()) } else { None }
    });
    let number = field("accountNumber").map(str::to_string)
        .or_else(|| field("accountNumberMasked").map(str::to_string));
    let boolean = |name: &str| p.get(name).and_then(|v| v.as_bool()).unwrap_or(false);
    let is_active = p.get("isActive").and_then(|v| v.as_bool()).unwrap_or(true) as i64;

    tx.execute(
        "INSERT INTO gym_payment_accounts (
            id, gym_id, method, label, status, is_active, is_primary, beneficiary_name,
            upi_vpa, bank_name, account_type, account_number, account_number_last4, ifsc_code,
            branch_name, branch_city, qr_image_url, instructions, created_at, updated_at
         ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?19)
         ON CONFLICT(id) DO UPDATE SET
            method = excluded.method, label = excluded.label, status = excluded.status,
            is_active = excluded.is_active, is_primary = excluded.is_primary,
            beneficiary_name = excluded.beneficiary_name, upi_vpa = excluded.upi_vpa,
            bank_name = excluded.bank_name, account_type = excluded.account_type,
            account_number = COALESCE(excluded.account_number, gym_payment_accounts.account_number),
            account_number_last4 = COALESCE(excluded.account_number_last4, gym_payment_accounts.account_number_last4),
            ifsc_code = excluded.ifsc_code, branch_name = excluded.branch_name,
            branch_city = excluded.branch_city, qr_image_url = excluded.qr_image_url,
            instructions = excluded.instructions, updated_at = excluded.updated_at",
        rusqlite::params![
            id, gid, method, field("label"), field("status").unwrap_or("UNVERIFIED"),
            is_active, boolean("isPrimary") as i64, beneficiary,
            field("upiVpa"), field("bankName"), field("accountType"), number, last4,
            field("ifscCode"), field("branchName"), field("branchCity"),
            field("qrImageUrl"), field("instructions"), now,
        ],
    )
    .map_err(|e| AppError::Database(format!("Failed to apply payment account: {}", e)))?;
    Ok(())
}
