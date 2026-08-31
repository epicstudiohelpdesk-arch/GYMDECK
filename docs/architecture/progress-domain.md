# GymDeck Fitness Progress Domain Architecture

## 1. Overview
The Fitness Progress Domain manages body composition metrics (weight in kg, circumference measurements in cm) and milestone achievements.

---

## 2. API Endpoints
* `GET /v1/member/progress/weight`: Returns chronological body weight logs.
* `POST /v1/member/progress/weight`: Records new body weight entry (validated between $30\text{--}300\text{ kg}$).
* `GET /v1/member/progress/measurements`: Returns body circumference history (chest, waist, arms, thighs, hips in cm).
* `POST /v1/member/progress/measurements`: Records body measurements.
* `GET /v1/member/progress/milestones`: Returns earned fitness milestone badges.

---

## 3. Canonical Units
* **Weight**: Kilograms (kg)
* **Circumference**: Centimeters (cm)
* **Historical Immutability**: New logs append records rather than overwriting historical data points.
