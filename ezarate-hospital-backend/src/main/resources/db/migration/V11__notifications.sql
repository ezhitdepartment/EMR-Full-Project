-- V11__notifications.sql
-- Generated entirely by DB triggers so they fire no matter which
-- screen/device caused the insert. Aimed at a ROLE (or set of roles), not
-- a specific person — per-user read state is tracked separately in
-- notification_reads, so two different nurses each get their own
-- "seen it" checkbox against the same shared notification.
--
--   Admin              -> new patient created; a lab order's tests all
--                          reach DONE/CANCELLED (order complete).
--   er_nurse/opd_nurse -> new patient created; new registration created.
--   doctor             -> new registration created.
--   med_tech/xray_tech -> new lab order test lands in their queue, scoped
--                          by form_type (same Laboratory vs X-Ray/
--                          Ultrasound & Imaging split as everywhere else).

CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_roles VARCHAR(30)[] NOT NULL,
    type         VARCHAR(30) NOT NULL,
    CONSTRAINT chk_notifications_type CHECK (type IN (
        'new_patient', 'new_registration', 'new_lab_test', 'lab_order_completed'
    )),
    title        VARCHAR(150) NOT NULL,
    message      TEXT NOT NULL,
    related_type VARCHAR(30),  -- 'patient' | 'encounter' | 'lab_order' | 'lab_order_test'
    related_id   VARCHAR(30),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_target_roles ON notifications USING gin (target_roles);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);

-- A notification is "unread" for a user until a row exists here.
CREATE TABLE notification_reads (
    notification_id UUID NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (notification_id, user_id)
);


-- New patient -> Admin + both nurse roles.
CREATE OR REPLACE FUNCTION notify_new_patient()
RETURNS TRIGGER AS $$
DECLARE
    full_name TEXT := trim(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
BEGIN
    INSERT INTO notifications (target_roles, type, title, message, related_type, related_id)
    VALUES (
        ARRAY['admin', 'er_nurse', 'opd_nurse'],
        'new_patient',
        'New Patient Registered',
        full_name || ' was added as a new patient.',
        'patient',
        NEW.hospital_no
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patients_notify_new
    AFTER INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_patient();


-- New registration -> both nurse roles + Doctor.
CREATE OR REPLACE FUNCTION notify_new_registration()
RETURNS TRIGGER AS $$
DECLARE
    full_name TEXT;
BEGIN
    SELECT trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
      INTO full_name
      FROM patients p
     WHERE p.id = NEW.patient_id;

    INSERT INTO notifications (target_roles, type, title, message, related_type, related_id)
    VALUES (
        ARRAY['er_nurse', 'opd_nurse', 'doctor'],
        'new_registration',
        'New Registration',
        COALESCE(full_name, 'A patient') || ' was registered for ' || COALESCE(NEW.consultation_type, 'a visit') || '.',
        'encounter',
        NEW.id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_encounters_notify_new
    AFTER INSERT ON encounters
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_registration();


-- New lab order test -> the tech role scoped to its form_type.
CREATE OR REPLACE FUNCTION notify_new_lab_test()
RETURNS TRIGGER AS $$
DECLARE
    full_name      TEXT;
    test_form_type TEXT;
    roles          VARCHAR(30)[];
BEGIN
    SELECT form_type INTO test_form_type FROM lab_test_catalog WHERE test_name = NEW.test_name;

    SELECT trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
      INTO full_name
      FROM lab_orders o
      JOIN patients p ON p.id = o.patient_id
     WHERE o.id = NEW.order_id;

    roles := CASE
        WHEN test_form_type = 'Laboratory' THEN ARRAY['med_tech']
        ELSE ARRAY['xray_tech']
    END;

    INSERT INTO notifications (target_roles, type, title, message, related_type, related_id)
    VALUES (
        roles,
        'new_lab_test',
        'New Lab Order',
        COALESCE(full_name, 'A patient') || ' — ' || NEW.test_name || ' requested.',
        'lab_order',
        NEW.order_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lab_order_tests_notify_new
    AFTER INSERT ON lab_order_tests
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_lab_test();


-- A lab order test just finished -> if nothing else on that order is
-- still PENDING, the order is complete -> Admin. Only fires once per
-- order even though multiple tests can reach DONE.
CREATE OR REPLACE FUNCTION notify_lab_order_completed()
RETURNS TRIGGER AS $$
DECLARE
    full_name        TEXT;
    still_pending    INT;
    already_notified BOOLEAN;
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'DONE' THEN
        SELECT count(*) INTO still_pending
          FROM lab_order_tests
         WHERE order_id = NEW.order_id AND status = 'PENDING';

        IF still_pending = 0 THEN
            SELECT EXISTS (
                SELECT 1 FROM notifications
                 WHERE type = 'lab_order_completed'
                   AND related_type = 'lab_order'
                   AND related_id = NEW.order_id
            ) INTO already_notified;

            IF NOT already_notified THEN
                SELECT trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
                  INTO full_name
                  FROM lab_orders o
                  JOIN patients p ON p.id = o.patient_id
                 WHERE o.id = NEW.order_id;

                INSERT INTO notifications (target_roles, type, title, message, related_type, related_id)
                VALUES (
                    ARRAY['admin'],
                    'lab_order_completed',
                    'Lab Order Completed',
                    COALESCE(full_name, 'A patient') || '''s lab order (' || NEW.order_id || ') is complete.',
                    'lab_order',
                    NEW.order_id
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lab_order_tests_notify_completed
    AFTER UPDATE ON lab_order_tests
    FOR EACH ROW
    EXECUTE FUNCTION notify_lab_order_completed();
