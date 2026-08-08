-- V18__remove_cashier_role.sql
--
-- Cashier role is being retired system-wide (not just from Lab Orders —
-- see V17). Any existing accounts still holding role = 'cashier' are
-- reassigned to 'staff' first so the tightened chk_users_role constraint
-- below doesn't fail on existing data; an admin should manually revisit
-- those accounts afterwards (rename, reassign the correct role, or
-- suspend/delete) since 'staff' is just a safe, unprivileged landing spot,
-- not a real replacement role.

UPDATE users SET role = 'staff' WHERE role = 'cashier';

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN (
    'admin', 'doctor', 'er_nurse', 'opd_nurse', 'med_tech',
    'xray_tech', 'pharmacist', 'staff'
));
