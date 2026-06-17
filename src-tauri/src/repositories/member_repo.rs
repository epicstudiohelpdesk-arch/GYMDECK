use rusqlite::{Connection, Transaction, params};
use uuid::Uuid;
use crate::models::gym_business::{Member, MemberDocument};
use crate::models::user::AuthenticatedContext;
use crate::errors::AppError;
use chrono::Utc;

pub struct MemberRepository;

impl MemberRepository {
    /// Fetches paginated members for the authenticated gym.
    /// Excludes soft-deleted records.
    pub fn get_members(
        conn: &Connection, 
        ctx: &AuthenticatedContext,
        limit: i32,
        offset: i32
    ) -> Result<Vec<Member>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT * FROM gym_members 
             WHERE gym_id = ?1 AND deleted_at IS NULL 
             ORDER BY created_at DESC
             LIMIT ?2 OFFSET ?3"
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let member_iter = stmt.query_map(
            params![ctx.gym_id.to_string(), limit, offset],
            |row| {
                Ok(Member {
                    id: Uuid::parse_str(&row.get::<_, String>("id")?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>("gym_id")?).unwrap_or_default(),
                    member_code: row.get("member_code")?,
                    full_name: row.get("full_name")?,
                    phone: row.get("phone")?,
                    alternate_phone: row.get("alternate_phone")?,
                    email: row.get("email")?,
                    gender: row.get("gender")?,
                    dob: row.get("dob")?,
                    address: row.get("address")?,
                    height: row.get("height")?,
                    weight: row.get("weight")?,
                    membership_plan_id: row.get::<_, Option<String>>("membership_plan_id")?
                        .and_then(|id| Uuid::parse_str(&id).ok()),
                    membership_status: row.get("membership_status")?,
                    joined_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("joined_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    expires_at: row.get::<_, Option<String>>("expires_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    profile_photo_path: row.get("profile_photo_path")?,
                    notes: row.get("notes")?,
                    created_by_user_id: Uuid::parse_str(&row.get::<_, String>("created_by_user_id")?).unwrap_or_default(),
                    updated_by_user_id: Uuid::parse_str(&row.get::<_, String>("updated_by_user_id")?).unwrap_or_default(),
                    created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("updated_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    deleted_at: row.get::<_, Option<String>>("deleted_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    deleted_by_user_id: row.get::<_, Option<String>>("deleted_by_user_id")?
                        .and_then(|id| Uuid::parse_str(&id).ok()),
                })
            },
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let mut members = Vec::new();
        for member in member_iter {
            members.push(member.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(members)
        }

        /// Fetches past members (soft-deleted) for the authenticated gym.
        pub fn get_past_members(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        limit: i32,
        offset: i32
        ) -> Result<Vec<Member>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT * FROM gym_members
             WHERE gym_id = ?1 AND deleted_at IS NOT NULL
             ORDER BY deleted_at DESC
             LIMIT ?2 OFFSET ?3"
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let member_iter = stmt.query_map(
            params![ctx.gym_id.to_string(), limit, offset],
            |row| {
                Ok(Member {
                    id: Uuid::parse_str(&row.get::<_, String>("id")?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>("gym_id")?).unwrap_or_default(),
                    member_code: row.get("member_code")?,
                    full_name: row.get("full_name")?,
                    phone: row.get("phone")?,
                    alternate_phone: row.get("alternate_phone")?,
                    email: row.get("email")?,
                    gender: row.get("gender")?,
                    dob: row.get("dob")?,
                    address: row.get("address")?,
                    height: row.get("height")?,
                    weight: row.get("weight")?,
                    membership_plan_id: row.get::<_, Option<String>>("membership_plan_id")?
                        .and_then(|id| Uuid::parse_str(&id).ok()),
                    membership_status: row.get("membership_status")?,
                    joined_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("joined_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    expires_at: row.get::<_, Option<String>>("expires_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    profile_photo_path: row.get("profile_photo_path")?,
                    notes: row.get("notes")?,
                    created_by_user_id: Uuid::parse_str(&row.get::<_, String>("created_by_user_id")?).unwrap_or_default(),
                    updated_by_user_id: Uuid::parse_str(&row.get::<_, String>("updated_by_user_id")?).unwrap_or_default(),
                    created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("updated_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    deleted_at: row.get::<_, Option<String>>("deleted_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    deleted_by_user_id: row.get::<_, Option<String>>("deleted_by_user_id")?
                        .and_then(|id| Uuid::parse_str(&id).ok()),
                })
            },
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let mut members = Vec::new();
        for member in member_iter {
            members.push(member.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(members)
        }

        /// Creates a new member record within a transaction.
    pub fn create_member(
        tx: &Transaction,
        ctx: &AuthenticatedContext,
        member: &Member
    ) -> Result<(), AppError> {
        tracing::info!("Attempting to create member: {} in gym: {}", member.full_name, ctx.gym_id);

        tx.execute(
            "INSERT INTO gym_members (
                id, gym_id, member_code, full_name, phone, alternate_phone, email, gender, dob, address,
                height, weight, membership_plan_id, membership_status, joined_at, expires_at,
                profile_photo_path, notes, created_by_user_id, updated_by_user_id,
                created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
            params![
                member.id.to_string(),
                ctx.gym_id.to_string(),
                &member.member_code,
                &member.full_name,
                &member.phone,
                &member.alternate_phone,
                &member.email,
                &member.gender,
                &member.dob,
                &member.address,
                &member.height,
                &member.weight,
                member.membership_plan_id.map(|id| id.to_string()),
                &member.membership_status,
                member.joined_at.to_rfc3339(),
                member.expires_at.map(|dt| dt.to_rfc3339()),
                &member.profile_photo_path,
                &member.notes,
                ctx.user_id.to_string(),
                ctx.user_id.to_string(),
                Utc::now().to_rfc3339(),
                Utc::now().to_rfc3339(),
            ],
        ).map_err(|e| {
            tracing::error!("Database INSERT failed for member {}: {}", member.full_name, e);
            AppError::Database(e.to_string())
        })?;

        Ok(())
    }

    /// Persists a document associated with a member.
    pub fn save_document(
        tx: &Transaction,
        ctx: &AuthenticatedContext,
        doc: &MemberDocument
    ) -> Result<(), AppError> {
        tx.execute(
            "INSERT INTO member_documents (
                id, member_id, gym_id, doc_name, doc_type, file_content, file_size, upload_date, status
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                doc.id.to_string(),
                doc.member_id.to_string(),
                ctx.gym_id.to_string(),
                &doc.doc_name,
                &doc.doc_type,
                &doc.file_content,
                &doc.file_size,
                doc.upload_date.to_rfc3339(),
                &doc.status,
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    /// Fetches all documents for a specific member.
    pub fn get_member_documents(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        member_id: &Uuid
    ) -> Result<Vec<MemberDocument>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT * FROM member_documents WHERE member_id = ?1 AND gym_id = ?2"
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let doc_iter = stmt.query_map(
            params![member_id.to_string(), ctx.gym_id.to_string()],
            |row| {
                Ok(MemberDocument {
                    id: Uuid::parse_str(&row.get::<_, String>("id")?).unwrap_or_default(),
                    member_id: Uuid::parse_str(&row.get::<_, String>("member_id")?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>("gym_id")?).unwrap_or_default(),
                    doc_name: row.get("doc_name")?,
                    doc_type: row.get("doc_type")?,
                    file_content: row.get("file_content")?,
                    file_size: row.get("file_size")?,
                    upload_date: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("upload_date")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    status: row.get("status")?,
                })
            },
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let mut docs = Vec::new();
        for doc in doc_iter {
            docs.push(doc.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(docs)
    }

    /// Soft-deletes a member.
    pub fn soft_delete_member(
        tx: &Transaction,
        ctx: &AuthenticatedContext,
        member_id: &Uuid
    ) -> Result<(), AppError> {
        let rows = tx.execute(
            "UPDATE gym_members 
             SET deleted_at = ?1, deleted_by_user_id = ?2 
             WHERE id = ?3 AND gym_id = ?4",
            params![
                Utc::now().to_rfc3339(),
                ctx.user_id.to_string(),
                member_id.to_string(),
                ctx.gym_id.to_string(),
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        if rows == 0 {
            return Err(AppError::Database("Member not found or unauthorized".into()));
        }

        Ok(())
    }
}
