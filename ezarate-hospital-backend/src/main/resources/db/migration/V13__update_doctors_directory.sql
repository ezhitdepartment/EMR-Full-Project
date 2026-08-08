-- V13__update_doctors_directory.sql
-- V2's seed data for doctors_directory was a placeholder (3 names) written
-- before the Supabase "profiles" table / doctors_directory view had real
-- production data in it. This replaces the placeholder with the actual
-- doctor roster pulled from Supabase's doctors_directory view
-- (SELECT ... FROM profiles WHERE role = 'doctor') as of 2026-07-29.

DELETE FROM doctors_directory;

INSERT INTO doctors_directory (name) VALUES
    ('Dr. Elijah Nethaniel Chua'),
    ('Dr. Marc Piton Ebreo'),
    ('Ralph Edward Gascon'),
    ('Dr. Ed Edgar Zarate');
