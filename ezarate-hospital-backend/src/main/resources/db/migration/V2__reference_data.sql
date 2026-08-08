-- V2__reference_data.sql
-- Lookup tables that other domain tables reference. No RLS here — read
-- access for these is "any authenticated user", enforced at the Spring
-- controller level (@PreAuthorize / a plain @GetMapping open to all
-- authenticated roles), not in the database.

CREATE TABLE doctors_directory (
    name VARCHAR(150) PRIMARY KEY
);
-- Standing in until admin/Users.jsx grows a real physicians directory —
-- swap encounters.doctor for a doctor_id FK into this table (or into
-- users, if doctors end up being login accounts) once that's built.
INSERT INTO doctors_directory (name) VALUES
    ('Edgar Zarate'), ('Ralph Edward Gascon'), ('Cliford Vincent C. Gamit');


CREATE TABLE lab_test_catalog (
    test_name   VARCHAR(150) PRIMARY KEY,
    form_type   VARCHAR(30)  NOT NULL,
    CONSTRAINT chk_lab_test_catalog_form_type CHECK (form_type IN (
        'Laboratory', 'X-Ray', 'Ultrasound & Imaging'
    )),
    category    VARCHAR(100) NOT NULL,
    code_prefix VARCHAR(20)  NOT NULL
);

INSERT INTO lab_test_catalog (test_name, form_type, category, code_prefix) VALUES
    -- Hematology
    ('CBC', 'Laboratory', 'Hematology', 'CBC'),
    ('CBC w/ PC', 'Laboratory', 'Hematology', 'CBCPC'),
    ('ESR', 'Laboratory', 'Hematology', 'ESR'),
    ('Platelet Count', 'Laboratory', 'Hematology', 'PLT'),
    ('Differential Count', 'Laboratory', 'Hematology', 'DIFF'),
    ('PT', 'Laboratory', 'Hematology', 'PT'),
    ('aPTT', 'Laboratory', 'Hematology', 'APTT'),
    -- Blood Chemistry
    ('Hgt', 'Laboratory', 'Blood Chemistry', 'HGT'),
    ('FBS', 'Laboratory', 'Blood Chemistry', 'FBS'),
    ('Lipid Profile', 'Laboratory', 'Blood Chemistry', 'LIPID'),
    ('SGPT', 'Laboratory', 'Blood Chemistry', 'SGPT'),
    ('SGOT', 'Laboratory', 'Blood Chemistry', 'SGOT'),
    ('Cholesterol', 'Laboratory', 'Blood Chemistry', 'CHOL'),
    ('Triglyceride', 'Laboratory', 'Blood Chemistry', 'TRIG'),
    ('HbA1c', 'Laboratory', 'Blood Chemistry', 'HBA1C'),
    ('BUN', 'Laboratory', 'Blood Chemistry', 'BUN'),
    ('Creatinine', 'Laboratory', 'Blood Chemistry', 'CREA'),
    ('BUA', 'Laboratory', 'Blood Chemistry', 'BUA'),
    -- Cardiac Markers
    ('CK-MB', 'Laboratory', 'Cardiac Markers', 'CKMB'),
    ('CPK', 'Laboratory', 'Cardiac Markers', 'CPK'),
    ('CPK-MM', 'Laboratory', 'Cardiac Markers', 'CPKMM'),
    ('Troponin I', 'Laboratory', 'Cardiac Markers', 'TROPI'),
    ('Troponin T', 'Laboratory', 'Cardiac Markers', 'TROPT'),
    -- Electrolytes
    ('Sodium Na+', 'Laboratory', 'Electrolytes', 'NA'),
    ('Potassium K+', 'Laboratory', 'Electrolytes', 'K'),
    ('Chloride Cl-', 'Laboratory', 'Electrolytes', 'CL'),
    ('Ionized Calcium', 'Laboratory', 'Electrolytes', 'ICA'),
    ('Lithium', 'Laboratory', 'Electrolytes', 'LI'),
    ('Inorganic Phosphorous', 'Laboratory', 'Electrolytes', 'PHOS'),
    ('Magnesium', 'Laboratory', 'Electrolytes', 'MG'),
    -- Hepatitis
    ('Anti HAV IgG', 'Laboratory', 'Hepatitis', 'HAVIGG'),
    ('Anti HAV IgM', 'Laboratory', 'Hepatitis', 'HAVIGM'),
    ('HBcAb', 'Laboratory', 'Hepatitis', 'HBCAB'),
    ('HBcAb IgM', 'Laboratory', 'Hepatitis', 'HBCABM'),
    ('HBsAb', 'Laboratory', 'Hepatitis', 'HBSAB'),
    ('HBsAg', 'Laboratory', 'Hepatitis', 'HBSAG'),
    -- Thyroid
    ('T3', 'Laboratory', 'Thyroid', 'T3'),
    ('T4', 'Laboratory', 'Thyroid', 'T4'),
    ('TSH', 'Laboratory', 'Thyroid', 'TSH'),
    ('Free T3', 'Laboratory', 'Thyroid', 'FT3'),
    ('Free T4', 'Laboratory', 'Thyroid', 'FT4'),
    -- Other Laboratory Tests
    ('Urinalysis', 'Laboratory', 'Other Laboratory Tests', 'UA'),
    ('Fecalysis', 'Laboratory', 'Other Laboratory Tests', 'FECA'),
    ('Occult Blood', 'Laboratory', 'Other Laboratory Tests', 'FOB'),
    ('Drug Test - Methamphetamine/Marijuana', 'Laboratory', 'Other Laboratory Tests', 'DRUG'),
    ('Others (Laboratory)', 'Laboratory', 'Other Laboratory Tests', 'LABOTH'),
    -- X-Ray
    ('Chest PA (Adult)', 'X-Ray', 'X-Ray', 'CXRPA'),
    ('AP/LAT (Adult)', 'X-Ray', 'X-Ray', 'APLATA'),
    ('AP/LAT (Pedia)', 'X-Ray', 'X-Ray', 'APLATP'),
    ('Plain Abdomen', 'X-Ray', 'X-Ray', 'PABD'),
    ('Apico-Lordotic', 'X-Ray', 'X-Ray', 'APICO'),
    ('Thoracic Cage', 'X-Ray', 'X-Ray', 'TCAGE'),
    ('Skull X-Ray', 'X-Ray', 'X-Ray', 'SKULL'),
    ('Lumbo-Sacral AP/LAT (Adult)', 'X-Ray', 'X-Ray', 'LSA'),
    ('Lumbo-Sacral AP/LAT (Pedia)', 'X-Ray', 'X-Ray', 'LSP'),
    ('Pelvic X-Ray', 'X-Ray', 'X-Ray', 'PXR'),
    ('Extremities', 'X-Ray', 'X-Ray', 'EXT'),
    ('Others (X-Ray)', 'X-Ray', 'X-Ray', 'XROTH'),
    -- Ultrasound & Imaging
    ('Whole Abdominal Ultrasound', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'WAUS'),
    ('HBT Ultrasound', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'HBTUS'),
    ('KUB', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'KUB'),
    ('KUB w/ Prostate', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'KUBP'),
    ('TransVaginal Ultrasound', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'TVUS'),
    ('Pelvic Ultrasound', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'PUS'),
    ('Bio-Physical Score', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'BPS'),
    ('2D Echocardiogram', 'Ultrasound & Imaging', 'Ultrasound & Imaging', '2DECHO'),
    ('CT Scan', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'CT'),
    ('MRI', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'MRI'),
    ('Others (Ultrasound & Imaging)', 'Ultrasound & Imaging', 'Ultrasound & Imaging', 'USOTH');


CREATE TABLE medicine_catalog (
    name VARCHAR(150) PRIMARY KEY
);

INSERT INTO medicine_catalog (name) VALUES
    ('Paracetamol 500mg (Biogesic)'), ('Paracetamol 500mg (Tempra)'),
    ('Paracetamol 250mg/5mL Syrup (Calpol)'), ('Mefenamic Acid 500mg (Ponstan)'),
    ('Ibuprofen 400mg (Advil)'), ('Ibuprofen 200mg (Medicol)'), ('Naproxen 500mg'),
    ('Celecoxib 200mg'), ('Tramadol 50mg'), ('Aspirin 80mg (Low-Dose)'),
    ('Bioflu (Paracetamol + Phenylephrine + Chlorphenamine)'),
    ('Neozep Forte (Phenylephrine + Chlorphenamine + Paracetamol)'),
    ('Decolgen Forte (Phenylephrine + Paracetamol + Chlorphenamine)'),
    ('Sinutab (Paracetamol + Phenylephrine)'), ('Solmux (Carbocisteine 500mg)'),
    ('Ambroxol 30mg (Mucosolvan)'), ('Robitussin DM (Dextromethorphan + Guaifenesin)'),
    ('Tuseran Forte (Dextromethorphan + Phenylephrine)'), ('Salbutamol 2mg/5mL Syrup'),
    ('Salbutamol Nebule 2.5mg/2.5mL (Ventolin)'), ('Ipratropium + Salbutamol Nebule (Berodual)'),
    ('Kremil-S (Antacid)'), ('Omeprazole 20mg'), ('Ranitidine 150mg'), ('Domperidone 10mg'),
    ('Buscopan (Hyoscine-N-Butylbromide) 10mg'), ('Loperamide 2mg (Imodium)'),
    ('Diatabs (Attapulgite)'), ('Dulcolax (Bisacodyl) 5mg'), ('Oral Rehydration Salts (Hydrite)'),
    ('Lactulose Syrup'), ('Cetirizine 10mg'), ('Loratadine 10mg (Allerta)'),
    ('Diphenhydramine 25mg (Benadryl)'), ('Betamethasone Cream'), ('Mupirocin Ointment'),
    ('Calamine Lotion'), ('Amoxicillin 500mg'), ('Co-Amoxiclav 625mg (Augmentin)'),
    ('Cefalexin 500mg'), ('Cefuroxime 500mg (Zinnat)'), ('Azithromycin 500mg (Zithromax)'),
    ('Ciprofloxacin 500mg'), ('Metronidazole 500mg'), ('Clindamycin 300mg'),
    ('Losartan 50mg'), ('Amlodipine 5mg'), ('Metoprolol 50mg'), ('Metformin 500mg (Glucophage)'),
    ('Gliclazide 80mg'), ('Simvastatin 20mg'), ('Atorvastatin 20mg'), ('Clopidogrel 75mg'),
    ('Ascorbic Acid 500mg (Poten-Cee)'), ('Multivitamins (Enervon)'), ('Multivitamins (Centrum)'),
    ('Ferrous Sulfate + Folic Acid'), ('Cherifer (Growth Formula)'), ('Zinc Sulfate 20mg'),
    ('Prednisone 20mg'), ('Diphenhydramine + Dextromethorphan (Robitussin)'),
    ('Insulin Regular (Humulin R)'), ('Insulin Glargine (Lantus)');


-- 881-row reference table. NOT bulk-inserted here — your React app already
-- has this as src/data/icd10Codes.js; we'll write a small loader (either a
-- CommandLineRunner reading that data, or a CSV + Flyway CSV import) once
-- we get to the ICD-10 lookup feature, instead of pasting 881 rows into a
-- migration file.
CREATE TABLE icd10_codes (
    code VARCHAR(20)  NOT NULL,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (code, name)
);
CREATE INDEX idx_icd10_codes_code ON icd10_codes (code);
