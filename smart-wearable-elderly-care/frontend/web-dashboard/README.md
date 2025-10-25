# SmartCare Web Dashboard / ���z���@����O

## Overview (English)
A standalone HTML/CSS/JavaScript dashboard that simulates the Smart Elderly Care portal. It now includes client-side authentication, resident CRUD, staffing controls, family messaging, and language/theme toggles for demo and UX validation.

## ���n�]�c�餤��^
������O�H�«e�ݤ覡���{���z���ӥ��x�A���صn�J/���U�B����޲z�B�H�O�վ�B�a�ݰT���B�y���P�D�D���������ҡA�i�ֳt�ܽd���~����C

---

## Key Features / �D�n�\��
- **Care Overview**�G�ʺA�έp�d�B��ĳ���J�B���ĵ���A�i�Ѻ޲z���Y�ɽs��C
- **Resident Directory**�G�j�M�B�ֳt�z��B����s�W/�s��/�R���A��ƫO�s���s�����C
- **Facility Operations**�G�ɦ���ΡB�Ƶ{�U���BAdmin �M�ݡu�H�O�վ�v���C
- **Family Engagement**�G�T�����ߡB������{�B���ɳs���B�n�J��i�s�W�T���C
- **Auth & Localization**�G�w�] Admin/Caregiver �b���B���@�̵��U�BLight/Dark�BEN/�c/? �y�������C

## Quick Start
1. `cd smart-wearable-elderly-care/frontend/web-dashboard`
2. `python -m http.server 5500`
3. Open http://localhost:5500 (Ctrl+F5 to bypass cache)

### Accounts / �b��
| Role | Username | Password |
|------|----------|----------|
| Admin | `Admin` | `admin` |
| Caregiver | `Ms.Testing` | `admin` |
| Sign Up | Create via modal | `admin` (default) |

Admin ��ơuEdit Overview / Adjust Staffing�v�v���ACaregiver �i���@����P�a�ݰT���C

## Localization / �y������
- Header dropdown: EN �� English�B�c �� �c�餤��B? �� ²�餤��C
- ����������B�D���s�B���Y�B�Ƽ��D�Y�ɧ�s�C
- �ϥΪ̰��n�P��ƬҫO�s�b `localStorage`�A���s��z���|�y���C

## Technology Notes
- No backend; all state�O�s�b�s�����C
- ���T�O�󥭥x�r���ۮe�A���s�ϥܧ�� ASCII �奻�]Sun/Moon/Edit/Del�^�C
- �i�@���ର React/Next.js �e����T�[�c�P�i�Ωʭ쫬�C
