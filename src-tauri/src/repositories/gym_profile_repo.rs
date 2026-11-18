/**
 * Local, per-gym persistence for Settings → Gym Profile: General tab details and
 * the uploaded brand imagery (logo + cover photo).
 *
 * There is exactly one row per gym (`gym_id` is the primary key), and every query is
 * scoped by `ctx.gym_id` — derived from the authenticated desktop session, never
 * supplied by the renderer. Uploads are stored as `data:` URLs so they survive
 * logout/login instead of dying with the page's blob URLs.
 */

use rusqlite::{params, Connection, Row};
use serde_json::{json, Map, Value};

use crate::errors::AppError;
use crate::models::user::AuthenticatedContext;

/// Roughly 6 MB of base64 payload per image; the UI caps files well below this.
const MAX_IMAGE_DATA_URL_LEN: usize = 8_000_000;
const MAX_BRANCHES: usize = 50;
const BRANCH_FIELDS: &[&str] = &[
    "id",
    "name",
    "isMain",
    "managerName",
    "phone",
    "address",
    "city",
    "state",
    "pincode",
    "members",
    "trainers",
];

fn row_to_dto(row: &Row<'_>) -> Result<Value, rusqlite::Error> {
    let branches_raw: String = row.get("branches_json")?;
    let branches: Value = serde_json::from_str(&branches_raw).unwrap_or_else(|_| json!([]));

    Ok(json!({
        "gymId": row.get::<_, String>("gym_id")?,
        "displayName": row.get::<_, Option<String>>("display_name")?,
        "tagline": row.get::<_, Option<String>>("tagline")?,
        "description": row.get::<_, Option<String>>("description")?,
        "foundedYear": row.get::<_, Option<String>>("founded_year")?,
        "businessType": row.get::<_, Option<String>>("business_type")?,
        "website": row.get::<_, Option<String>>("website")?,
        "address": row.get::<_, Option<String>>("address_line")?,
        "city": row.get::<_, Option<String>>("city")?,
        "state": row.get::<_, Option<String>>("state")?,
        "pincode": row.get::<_, Option<String>>("pincode")?,
        "openingHours": row.get::<_, Option<String>>("opening_hours")?,
        "closingHours": row.get::<_, Option<String>>("closing_hours")?,
        "weekendOpening": row.get::<_, Option<String>>("weekend_opening")?,
        "weekendClosing": row.get::<_, Option<String>>("weekend_closing")?,
        "slotDurationMinutes": row.get::<_, Option<String>>("slot_duration_minutes")?,
        "autoHolidayClosure": row.get::<_, i64>("auto_holiday_closure")? != 0,
        "qrCheckinEnabled": row.get::<_, i64>("qr_checkin_enabled")? != 0,
        "qrTurnstileRelay": row.get::<_, i64>("qr_turnstile_relay")? != 0,
        "qrAudibleChime": row.get::<_, i64>("qr_audible_chime")? != 0,
        "isPubliclyActive": row.get::<_, i64>("is_publicly_active")? != 0,
        "subdomain": row.get::<_, Option<String>>("subdomain")?,
        "customDomain": row.get::<_, Option<String>>("custom_domain")?,
        "logoDataUrl": row.get::<_, Option<String>>("logo_data_url")?,
        "coverDataUrl": row.get::<_, Option<String>>("cover_data_url")?,
        "branches": branches,
        "updatedAt": row.get::<_, String>("updated_at")?,
    }))
}

fn opt_string(payload: &Value, key: &str) -> Option<String> {
    payload
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn bool_value(payload: &Value, key: &str, fallback: bool) -> bool {
    payload.get(key).and_then(|v| v.as_bool()).unwrap_or(fallback)
}

fn bounded(label: &str, value: &Option<String>, max: usize) -> Result<(), AppError> {
    if let Some(text) = value {
        if text.chars().count() > max {
            return Err(AppError::Configuration(format!(
                "{} must be {} characters or fewer.",
                label, max
            )));
        }
    }
    Ok(())
}

/// Only inline `data:image/...` payloads are accepted; anything else (blob:, http:,
/// file:) would not survive a restart or would smuggle a remote/script URL.
fn validate_image(label: &str, value: &Option<String>) -> Result<(), AppError> {
    let Some(data_url) = value else { return Ok(()) };
    if !data_url.starts_with("data:image/") {
        return Err(AppError::Configuration(format!(
            "{} must be an uploaded image.",
            label
        )));
    }
    if data_url.len() > MAX_IMAGE_DATA_URL_LEN {
        return Err(AppError::Configuration(format!(
            "{} is too large to store. Choose a smaller image.",
            label
        )));
    }
    Ok(())
}

/// Normalises the branch list into JSON, keeping only known fields so the blob
/// stored for a gym can never carry arbitrary keys.
fn sanitize_branches(payload: &Value) -> Result<String, AppError> {
    let Some(raw) = payload.get("branches") else {
        return Ok("[]".into());
    };
    let Some(items) = raw.as_array() else {
        return Err(AppError::Configuration("Branches must be a list.".into()));
    };
    if items.len() > MAX_BRANCHES {
        return Err(AppError::Configuration(format!(
            "A gym can store at most {} branches.",
            MAX_BRANCHES
        )));
    }

    let mut cleaned: Vec<Value> = Vec::with_capacity(items.len());
    for item in items {
        let Some(object) = item.as_object() else {
            return Err(AppError::Configuration("Each branch must be an object.".into()));
        };
        let mut branch = Map::new();
        for field in BRANCH_FIELDS {
            if let Some(value) = object.get(*field) {
                match value {
                    Value::String(text) if text.chars().count() > 200 => {
                        return Err(AppError::Configuration(
                            "Branch fields must be 200 characters or fewer.".into(),
                        ))
                    }
                    Value::String(_) | Value::Bool(_) | Value::Number(_) | Value::Null => {
                        branch.insert((*field).to_string(), value.clone());
                    }
                    _ => {}
                }
            }
        }
        cleaned.push(Value::Object(branch));
    }

    serde_json::to_string(&cleaned)
        .map_err(|e| AppError::Configuration(format!("Could not store branches: {}", e)))
}

pub struct GymProfileRepository;

impl GymProfileRepository {
    pub fn get(conn: &Connection, ctx: &AuthenticatedContext) -> Result<Option<Value>, AppError> {
        let mut stmt = conn
            .prepare("SELECT * FROM gym_profile_details WHERE gym_id = ?1 LIMIT 1")
            .map_err(|e| AppError::Database(e.to_string()))?;
        let mut rows = stmt
            .query_map(params![ctx.gym_id.to_string()], row_to_dto)
            .map_err(|e| AppError::Database(e.to_string()))?;
        match rows.next() {
            Some(row) => Ok(Some(row.map_err(|e| AppError::Database(e.to_string()))?)),
            None => Ok(None),
        }
    }

    /// Full write of the General tab (plus whatever imagery the caller sends).
    pub fn upsert(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        payload: &Value,
    ) -> Result<Value, AppError> {
        let display_name = opt_string(payload, "displayName");
        let tagline = opt_string(payload, "tagline");
        let description = opt_string(payload, "description");
        let founded_year = opt_string(payload, "foundedYear");
        let business_type = opt_string(payload, "businessType");
        let website = opt_string(payload, "website");
        let address = opt_string(payload, "address");
        let city = opt_string(payload, "city");
        let state = opt_string(payload, "state");
        let pincode = opt_string(payload, "pincode");
        let opening_hours = opt_string(payload, "openingHours");
        let closing_hours = opt_string(payload, "closingHours");
        let weekend_opening = opt_string(payload, "weekendOpening");
        let weekend_closing = opt_string(payload, "weekendClosing");
        let slot_duration = opt_string(payload, "slotDurationMinutes");
        let subdomain = opt_string(payload, "subdomain").map(|s| s.to_lowercase());
        let custom_domain = opt_string(payload, "customDomain").map(|s| s.to_lowercase());
        let logo = opt_string(payload, "logoDataUrl");
        let cover = opt_string(payload, "coverDataUrl");

        bounded("Gym brand name", &display_name, 120)?;
        bounded("Tagline", &tagline, 160)?;
        bounded("Facility description", &description, 4000)?;
        bounded("Founded year", &founded_year, 10)?;
        bounded("Business type", &business_type, 80)?;
        bounded("Website", &website, 300)?;
        bounded("Address", &address, 300)?;
        bounded("City", &city, 120)?;
        bounded("State", &state, 120)?;
        bounded("Subdomain", &subdomain, 63)?;
        bounded("Custom domain", &custom_domain, 253)?;

        if let Some(url) = &website {
            if !url.starts_with("http://") && !url.starts_with("https://") {
                return Err(AppError::Configuration(
                    "Website must start with http:// or https://.".into(),
                ));
            }
        }
        validate_image("Gym logo", &logo)?;
        validate_image("Cover photo", &cover)?;

        if let Some(pin) = &pincode {
            if !(4..=10).contains(&pin.chars().count()) || !pin.chars().all(|c| c.is_ascii_digit()) {
                return Err(AppError::Configuration(
                    "Pincode must be a 4-10 digit number.".into(),
                ));
            }
        }

        let branches_json = sanitize_branches(payload)?;
        let gym_id = ctx.gym_id.to_string();
        let user_id = ctx.user_id.to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        tx.execute(
            "INSERT INTO gym_profile_details (
                gym_id, display_name, tagline, description, founded_year, business_type,
                website, address_line, city, state, pincode,
                opening_hours, closing_hours, weekend_opening, weekend_closing,
                slot_duration_minutes, auto_holiday_closure,
                qr_checkin_enabled, qr_turnstile_relay, qr_audible_chime, is_publicly_active,
                subdomain, custom_domain, logo_data_url, cover_data_url, branches_json,
                created_by, updated_by, created_at, updated_at
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,
                       ?22,?23,?24,?25,?26,?27,?27,?28,?28)
             ON CONFLICT(gym_id) DO UPDATE SET
                display_name = excluded.display_name,
                tagline = excluded.tagline,
                description = excluded.description,
                founded_year = excluded.founded_year,
                business_type = excluded.business_type,
                website = excluded.website,
                address_line = excluded.address_line,
                city = excluded.city,
                state = excluded.state,
                pincode = excluded.pincode,
                opening_hours = excluded.opening_hours,
                closing_hours = excluded.closing_hours,
                weekend_opening = excluded.weekend_opening,
                weekend_closing = excluded.weekend_closing,
                slot_duration_minutes = excluded.slot_duration_minutes,
                auto_holiday_closure = excluded.auto_holiday_closure,
                qr_checkin_enabled = excluded.qr_checkin_enabled,
                qr_turnstile_relay = excluded.qr_turnstile_relay,
                qr_audible_chime = excluded.qr_audible_chime,
                is_publicly_active = excluded.is_publicly_active,
                subdomain = excluded.subdomain,
                custom_domain = excluded.custom_domain,
                logo_data_url = excluded.logo_data_url,
                cover_data_url = excluded.cover_data_url,
                branches_json = excluded.branches_json,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at",
            params![
                gym_id,
                display_name,
                tagline,
                description,
                founded_year,
                business_type,
                website,
                address,
                city,
                state,
                pincode,
                opening_hours,
                closing_hours,
                weekend_opening,
                weekend_closing,
                slot_duration,
                bool_value(payload, "autoHolidayClosure", true) as i64,
                bool_value(payload, "qrCheckinEnabled", true) as i64,
                bool_value(payload, "qrTurnstileRelay", true) as i64,
                bool_value(payload, "qrAudibleChime", true) as i64,
                bool_value(payload, "isPubliclyActive", true) as i64,
                subdomain,
                custom_domain,
                logo,
                cover,
                branches_json,
                user_id,
                now,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        let dto = Self::get(&tx, ctx)?.ok_or_else(|| {
            AppError::Database("Failed to load saved gym profile details.".into())
        })?;
        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Ok(dto)
    }

    /// Writes only the imagery, so an upload lands in the vault immediately without
    /// waiting for the rest of the form. `None` for a field means "leave as is";
    /// `Some(None)` clears the stored image.
    pub fn save_media(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        logo: Option<Option<String>>,
        cover: Option<Option<String>>,
    ) -> Result<Value, AppError> {
        validate_image("Gym logo", &logo.clone().flatten())?;
        validate_image("Cover photo", &cover.clone().flatten())?;

        let gym_id = ctx.gym_id.to_string();
        let user_id = ctx.user_id.to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let has_logo = logo.is_some() as i64;
        let has_cover = cover.is_some() as i64;

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        tx.execute(
            "INSERT INTO gym_profile_details (gym_id, logo_data_url, cover_data_url, created_by, updated_by, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?5)
             ON CONFLICT(gym_id) DO UPDATE SET
                logo_data_url = CASE WHEN ?6 = 1 THEN excluded.logo_data_url ELSE logo_data_url END,
                cover_data_url = CASE WHEN ?7 = 1 THEN excluded.cover_data_url ELSE cover_data_url END,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at",
            params![
                gym_id,
                logo.clone().flatten(),
                cover.clone().flatten(),
                user_id,
                now,
                has_logo,
                has_cover,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        let dto = Self::get(&tx, ctx)?.ok_or_else(|| {
            AppError::Database("Failed to load saved gym branding.".into())
        })?;
        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Ok(dto)
    }
}
