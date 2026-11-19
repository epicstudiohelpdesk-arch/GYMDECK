use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryCategory {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub image_reference: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventorySupplier {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub supplier_name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub gstin: Option<String>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryProductImage {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub product_id: Uuid,
    pub storage_key: String,
    pub original_filename: String,
    pub mime_type: String,
    pub file_size: i64,
    pub width: Option<i64>,
    pub height: Option<i64>,
    pub sort_order: i64,
    pub is_primary: bool,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryVariant {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub product_id: Uuid,
    pub variant_name: String,
    pub attributes_json: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub cost_price_minor_units: Option<i64>,
    pub selling_price_minor_units: i64,
    pub mrp_minor_units: Option<i64>,
    pub low_stock_threshold: i64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub available_quantity: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryBatch {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub product_id: Uuid,
    pub variant_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub batch_number: String,
    pub manufactured_at: Option<String>,
    pub expires_at: Option<String>,
    pub received_quantity: i64,
    pub available_quantity: i64,
    pub purchase_cost_minor_units: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub supplier_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryProduct {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub category_id: Option<Uuid>,
    pub name: String,
    pub brand: Option<String>,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub product_type: String,
    pub unit_of_measure: String,
    pub cost_price_minor_units: Option<i64>,
    pub selling_price_minor_units: i64,
    pub mrp_minor_units: Option<i64>,
    pub discount_price_minor_units: Option<i64>,
    pub tax_configuration: Option<String>,
    pub tax_rate: Option<f64>,
    pub has_variants: bool,
    pub batch_tracking_enabled: bool,
    pub expiry_tracking_enabled: bool,
    pub low_stock_threshold: i64,
    pub status: String,
    pub store_visibility: String,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,

    // Enriched fields for catalog / UI views
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category_name: Option<String>,
    #[serde(default)]
    pub available_quantity: i64,
    #[serde(default)]
    pub reserved_quantity: i64,
    #[serde(default)]
    pub images: Vec<InventoryProductImage>,
    #[serde(default)]
    pub variants: Vec<InventoryVariant>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_image: Option<InventoryProductImage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryStockMovement {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub product_id: Uuid,
    pub variant_id: Option<Uuid>,
    pub batch_id: Option<Uuid>,
    pub movement_type: String,
    pub quantity_change: i64,
    pub quantity_before: i64,
    pub quantity_after: i64,
    pub unit_cost_minor_units: Option<i64>,
    pub reference_type: Option<String>,
    pub reference_id: Option<String>,
    pub reason: Option<String>,
    pub actor_id: Option<String>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub batch_number: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryOverviewStats {
    pub total_products: i64,
    pub total_units_in_stock: i64,
    pub low_stock_count: i64,
    pub out_of_stock_count: i64,
    pub expiring_soon_count: i64,
    pub expired_count: i64,
    pub valuation_minor_units: i64,
}
