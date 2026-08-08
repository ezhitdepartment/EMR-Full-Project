-- delete_patient.sql
-- Permanently deletes ONE patient and every record tied to them:
-- consultations, lab orders (+ their tests/files), medicine prescriptions
-- (+ their line items), encounters (+ triage/waivers), guardian info,
-- clinical documents (EMR/discharge/konsulta/medcert/etc.), and any
-- notifications referencing them.
--
-- >>> EDIT THE LINE BELOW before running — put the target patient's
-- >>> Hospital No. between the quotes.
--
-- THIS IS IRREVERSIBLE. Take a backup first (see the PowerShell notes
-- you were given). Nothing commits unless a patient with that hospital_no
-- is actually found — if not found, the whole thing aborts safely.

BEGIN;

DO $$
DECLARE
    v_hospital_no   TEXT := '00003';   -- <<< EDIT THIS
    v_patient_id    UUID;
    v_encounter_ids VARCHAR(30)[];
    v_order_ids     VARCHAR(30)[];
    v_count         INT;
BEGIN
    SELECT id INTO v_patient_id FROM patients WHERE hospital_no = v_hospital_no;

    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'No patient found with hospital_no = %', v_hospital_no;
    END IF;

    RAISE NOTICE 'Deleting patient id=% (hospital_no=%)', v_patient_id, v_hospital_no;

    -- Capture ids up front for the optional notifications cleanup at the
    -- end (once encounters/lab_orders are gone, we can't look these up).
    SELECT array_agg(id) INTO v_encounter_ids FROM encounters WHERE patient_id = v_patient_id;
    SELECT array_agg(id) INTO v_order_ids FROM lab_orders WHERE patient_id = v_patient_id;

    -- 1) Consultations — must go before encounters (consultations.encounter_id
    --    has no ON DELETE clause, so it would block deleting the encounter).
    DELETE FROM consultations WHERE patient_id = v_patient_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; RAISE NOTICE '  consultations: %', v_count;

    -- 2) Lab orders — cascades to lab_order_tests and lab_order_files.
    DELETE FROM lab_orders WHERE patient_id = v_patient_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; RAISE NOTICE '  lab_orders: % (tests/files cascade automatically)', v_count;

    -- 3) Medicine prescriptions — cascades to prescription_items.
    DELETE FROM medicine_prescriptions WHERE patient_id = v_patient_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; RAISE NOTICE '  medicine_prescriptions: % (items cascade automatically)', v_count;

    -- 4) Encounters — cascades to encounter_triage and encounter_waivers.
    DELETE FROM encounters WHERE patient_id = v_patient_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; RAISE NOTICE '  encounters: % (triage/waivers cascade automatically)', v_count;

    -- 5) The patient row itself — cascades to patient_guardians (by
    --    patient_id) and patient_documents (by hospital_no).
    DELETE FROM patients WHERE id = v_patient_id;
    RAISE NOTICE '  patients: 1 (guardian info + clinical documents cascade automatically)';

    -- 6) Optional cleanup — notifications aren't real foreign keys, so
    --    they never blocked anything, but this clears out any leftover
    --    "New Patient Registered" / "New Registration" / lab order
    --    notices that referenced this patient so they stop showing up in
    --    the notification bell for no reason.
    DELETE FROM notifications
    WHERE (related_type = 'patient' AND related_id = v_hospital_no)
       OR (related_type = 'encounter' AND related_id = ANY(COALESCE(v_encounter_ids, ARRAY[]::VARCHAR[])))
       OR (related_type = 'lab_order' AND related_id = ANY(COALESCE(v_order_ids, ARRAY[]::VARCHAR[])));
    GET DIAGNOSTICS v_count = ROW_COUNT; RAISE NOTICE '  notifications cleaned up: % (notification_reads cascades automatically)', v_count;

    RAISE NOTICE 'Done — patient % fully deleted.', v_hospital_no;
END $$;

COMMIT;