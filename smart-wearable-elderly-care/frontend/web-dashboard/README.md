# SmartCare Web Dashboard / 智慧照護儀表板

## Overview (English)
A standalone HTML/CSS/JavaScript dashboard that simulates the Smart Elderly Care portal. It now includes client-side authentication, resident CRUD, staffing controls, family messaging, and language/theme toggles for demo and UX validation.

## 概要（繁體中文）
此儀表板以純前端方式重現智慧長照平台，內建登入/註冊、住民管理、人力調整、家屬訊息、語言與主題切換等情境，可快速示範產品體驗。

---

## Key Features / 主要功能
- **Care Overview**：動態統計卡、建議介入、近期警報，可由管理員即時編輯。
- **Resident Directory**：搜尋、快速篩選、住民新增/編輯/刪除，資料保存於瀏覽器。
- **Facility Operations**：床位佔用、排程下載、Admin 專屬「人力調整」表單。
- **Family Engagement**：訊息中心、探視日程、分享連結、登入後可新增訊息。
- **Auth & Localization**：預設 Admin/Caregiver 帳號、看護者註冊、Light/Dark、EN/繁/? 語言切換。

## Quick Start
1. `cd smart-wearable-elderly-care/frontend/web-dashboard`
2. `python -m http.server 5500`
3. Open http://localhost:5500 (Ctrl+F5 to bypass cache)

### Accounts / 帳號
| Role | Username | Password |
|------|----------|----------|
| Admin | `Admin` | `admin` |
| Caregiver | `Ms.Testing` | `admin` |
| Sign Up | Create via modal | `admin` (default) |

Admin 具備「Edit Overview / Adjust Staffing」權限，Caregiver 可維護住民與家屬訊息。

## Localization / 語言切換
- Header dropdown: EN → English、繁 → 繁體中文、? → 簡體中文。
- 切換後導覽、主按鈕、表頭、副標題即時更新。
- 使用者偏好與資料皆保存在 `localStorage`，重新整理不會流失。

## Technology Notes
- No backend; all state保存在瀏覽器。
- 為確保跨平台字元相容，按鈕圖示改用 ASCII 文本（Sun/Moon/Edit/Del）。
- 可作為轉為 React/Next.js 前的資訊架構與可用性原型。
