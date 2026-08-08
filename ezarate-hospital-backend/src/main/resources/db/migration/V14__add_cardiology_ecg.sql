-- V14__add_cardiology_ecg.sql
-- Adds a "Cardiology" category (ECG) to the diagnostics catalog. Kept under
-- form_type = 'Laboratory' — same access group as Cardiac Markers — so this
-- is performable by med_tech without any change to LabOrderService's
-- ROLE_FORM_TYPES or the lab_test_catalog.form_type CHECK constraint.

INSERT INTO lab_test_catalog (test_name, form_type, category, code_prefix) VALUES
    ('ECG', 'Laboratory', 'Cardiology', 'ECG');
