# GYMDECK PAYMENTS V3: 33-RECORD BEFORE-AND-AFTER MIGRATION MAPPING REPORT

**Database Target:** `gymdeck_cloud` (PostgreSQL)  
**Table:** `gym_payment_accounts`  
**Total Records Audited:** 33  
**Migration Scope:** Zero-data-loss transition to Payments V3 Modular Architecture with strict purpose mapping, encrypted coordinate preservation, and card gateway isolation.

---

## 1. Migration Principles & Guarantees

1. **Zero Data Loss**:
   - Every UUID (`id`), tenant association (`gym_id`), encrypted account number (`account_number_enc`), masked last4 (`account_number_last4`), IFSC code (`ifsc_code`), beneficiary name (`beneficiary_name`), and UPI VPA (`upi_vpa`) is preserved intact.
2. **Strict Purpose Mapping (No Blind Inflow Assignment)**:
   - All 22 UPI accounts are designated `INFLOW` (UPI collection rails).
   - All 11 Bank accounts are preserved as `BOTH` (Dual-Purpose: Direct IMPS/NEFT fee settlement inflow + Trainer salary disbursal outflow), ensuring gyms like Iron Pulse and Bravo Gym retain full settlement and payroll capabilities.
3. **Foreign Key Integrity**:
   - The 9 accounts actively referenced by `payment_attempts` retain identical IDs, preventing orphaned transactions or broken receipt lookups.
4. **Verification Status Protection**:
   - All unverified records remain `UNVERIFIED`.
   - Disabled records remain `DISABLED`. No automatic verification is granted.
5. **Card Gateway Isolation**:
   - Zero payment gateway fields or credentials are mixed into bank accounts. Card Gateways are managed as separate provider connections.

---

## 2. Global Inventory Summary

| Method | Total Records | Primary Active | Secondary Active | Disabled | Proposed V3 Purpose |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **UPI** | 22 | 11 | 9 | 2 | `INFLOW` |
| **BANK_TRANSFER** | 11 | 11 | 0 | 0 | `BOTH` (Dual-Purpose) |
| **TOTAL** | **33** | **22** | **9** | **2** | **100% Account Preservation** |

---

## 3. Comprehensive 33-Record Before-and-After Ledger

| # | Gym ID (Tenant) | Account ID (PK) | Method | Label (Before) | Status (Before) | Coordinates / VPA | Active | Primary | Foreign Refs | V3 Purpose (After) | V3 Role / Scope |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | `0786f674-...` | `ff2fe568-...` | UPI | — | `UNVERIFIED` | `alphagym@okhdfcbank` | True | False | 0 | **`INFLOW`** | Secondary Inflow UPI |
| **2** | `0786f674-...` | `0afb9b62-...` | UPI | — | `UNVERIFIED` | `second@okaxis` | True | True | 4 attempts | **`INFLOW`** | Primary Inflow UPI |
| **3** | `0e8fa929-...` | `6bebfb10-...` | UPI | — | `UNVERIFIED` | `alphagym@okhdfcbank` | True | False | 0 | **`INFLOW`** | Secondary Inflow UPI |
| **4** | `0e8fa929-...` | `f77ff222-...` | UPI | — | `UNVERIFIED` | `second@okaxis` | True | True | 4 attempts | **`INFLOW`** | Primary Inflow UPI |
| **5** | `1800fbea-...` | `4590754a-...` | UPI | — | `UNVERIFIED` | `alphagym@okhdfcbank` | True | False | 0 | **`INFLOW`** | Secondary Inflow UPI |
| **6** | `1800fbea-...` | `49f5be29-...` | UPI | — | `UNVERIFIED` | `second@okaxis` | True | True | 4 attempts | **`INFLOW`** | Primary Inflow UPI |
| **7** | `38b051ed-...` | `494e5fe1-...` | BANK | — | `UNVERIFIED` | `•••• 9012` (HDFC) | True | True | 0 | **`BOTH`** | Dual-Purpose Bank Account |
| **8** | `3a134b0f-...` | `f74ff966-...` | UPI | — | `UNVERIFIED` | `alphagym@okhdfcbank` | True | False | 0 | **`INFLOW`** | Secondary Inflow UPI |
| **9** | `3a134b0f-...` | `e86adbd4-...` | UPI | — | `UNVERIFIED` | `second@okaxis` | True | True | 2 attempts | **`INFLOW`** | Primary Inflow UPI |
| **10** | `401ffb9f-...` | `e9c54ca9-...` | UPI | — | `UNVERIFIED` | `alphagym@okhdfcbank` | True | False | 0 | **`INFLOW`** | Secondary Inflow UPI |
| **11** | `401ffb9f-...` | `601b6dd9-...` | UPI | — | `UNVERIFIED` | `second@okaxis` | True | True | 4 attempts | **`INFLOW`** | Primary Inflow UPI |
| **12** | `55114f6c-...` *(Iron Pulse)* | `00c31bed-...` | BANK | Primary Collections (Updated) | `UNVERIFIED` | `•••• 0193` (HDFC Bank) | True | True | 0 | **`BOTH`** | **Dual-Purpose Inflow + Payroll** |
| **13** | `55114f6c-...` *(Iron Pulse)* | `937d0adb-...` | UPI | Countertop Merchant UPI | `UNVERIFIED` | `ironpulse.fitness@okhdfcbank` | True | True | 0 | **`INFLOW`** | **Primary Merchant Standee UPI** |
| **14** | `55114f6c-...` *(Iron Pulse)* | `2e97d1f8-...` | UPI | — | `DISABLED` | `ironpulse.desk@icici` | False | False | 0 | **`INFLOW`** | Deactivated Historical UPI |
| **15** | `5f4c9e6e-...` | `eb00dc03-...` | BANK | — | `UNVERIFIED` | `•••• 9012` (HDFC) | True | True | 0 | **`BOTH`** | Dual-Purpose Bank Account |
| **16** | `5fc96569-...` | `3c4badbc-...` | BANK | — | `UNVERIFIED` | `•••• 9012` (HDFC) | True | True | 0 | **`BOTH`** | Dual-Purpose Bank Account |
| **17** | `6d6a5827-...` | `ec7e9932-...` | BANK | Primary Collections (Updated) | `UNVERIFIED` | `•••• 0193` (HDFC Bank) | True | True | 0 | **`BOTH`** | **Dual-Purpose Inflow + Payroll** |
| **18** | `6d6a5827-...` | `70ca8caa-...` | UPI | Countertop Merchant UPI | `UNVERIFIED` | `ironpulse.fitness@okhdfcbank` | True | True | 1 attempt | **`INFLOW`** | **Primary Merchant Standee UPI** |
| **19** | `6d6a5827-...` | `d013452e-...` | UPI | — | `DISABLED` | `ironpulse.desk@icici` | False | False | 0 | **`INFLOW`** | Deactivated Historical UPI |
| **20** | `712cbaee-...` | `96316ce4-...` | BANK | — | `UNVERIFIED` | `•••• 9012` (HDFC) | True | True | 0 | **`BOTH`** | Dual-Purpose Bank Account |
| **21** | `725d5b85-...` | `304d6b4a-...` | BANK | — | `UNVERIFIED` | `•••• 9012` (HDFC) | True | True | 0 | **`BOTH`** | Dual-Purpose Bank Account |
| **22** | `81076399-...` | `3b7e7442-...` | BANK | — | `UNVERIFIED` | `•••• 9012` (HDFC) | True | True | 0 | **`BOTH`** | Dual-Purpose Bank Account |
| **23** | `8bc7e080-...` | `ba2c37a1-...` | UPI | — | `UNVERIFIED` | `alphagym@okhdfcbank` | True | False | 0 | **`INFLOW`** | Secondary Inflow UPI |
| **24** | `8bc7e080-...` | `57950c5f-...` | UPI | — | `UNVERIFIED` | `second@okaxis` | True | True | 1 attempt | **`INFLOW`** | Primary Inflow UPI |
| **25** | `a01c381c-...` | `e95c414e-...` | BANK | — | `UNVERIFIED` | `•••• 9012` (HDFC) | True | True | 0 | **`BOTH`** | Dual-Purpose Bank Account |
| **26** | `a5dea0df-...` | `e8e5d2be-...` | BANK | — | `UNVERIFIED` | `•••• 9012` (HDFC) | True | True | 0 | **`BOTH`** | Dual-Purpose Bank Account |
| **27** | `b23d83b8-...` | `569748c0-...` | UPI | — | `UNVERIFIED` | `alphagym@okhdfcbank` | True | False | 0 | **`INFLOW`** | Secondary Inflow UPI |
| **28** | `b23d83b8-...` | `439d857d-...` | UPI | — | `UNVERIFIED` | `second@okaxis` | True | True | 0 | **`INFLOW`** | Primary Inflow UPI |
| **29** | `bd2c7207-...` | `ee554d60-...` | UPI | — | `UNVERIFIED` | `alphagym@okhdfcbank` | True | False | 0 | **`INFLOW`** | Secondary Inflow UPI |
| **30** | `bd2c7207-...` | `5ba3a169-...` | UPI | — | `UNVERIFIED` | `second@okaxis` | True | True | 4 attempts | **`INFLOW`** | Primary Inflow UPI |
| **31** | `bdcad966-...` | `75d304e5-...` | UPI | — | `UNVERIFIED` | `alphagym@okhdfcbank` | True | False | 0 | **`INFLOW`** | Secondary Inflow UPI |
| **32** | `bdcad966-...` | `3c90af45-...` | UPI | — | `UNVERIFIED` | `second@okaxis` | True | True | 4 attempts | **`INFLOW`** | Primary Inflow UPI |
| **33** | `f8b29c9e-...` | `d825ffa7-...` | BANK | — | `UNVERIFIED` | `•••• 9012` (HDFC) | True | True | 0 | **`BOTH`** | Dual-Purpose Bank Account |

---

## 4. Verification & Validation Rules

1. **Dual Purpose Preservation**:
   - Accounts #7, #12, #15, #16, #17, #20, #21, #22, #25, #26, #33 represent bank accounts with existing full bank transfer capabilities. Each is mapped to `purpose = 'BOTH'`, so neither inflow fee collection nor payroll outflow routing is broken.
2. **UPI Rails Isolation**:
   - Accounts #1–6, #8–11, #13–14, #18–19, #23–24, #27–32 represent UPI VPAs. Each is mapped to `purpose = 'INFLOW'`.
3. **Encrypted Ciphertexts Intact**:
   - All 11 bank accounts contain valid AES-256-GCM ciphertexts in `account_number_enc`. No decryption or destructive modification is performed.
4. **Referential Integrity**:
   - Zero rows deleted; zero primary keys regenerated. All 9 rows referenced by `payment_attempts` maintain exact referential continuity.
