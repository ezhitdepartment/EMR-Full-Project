// Medicine Prescriptions data layer — backed by the Spring Boot
// MedicinePrescriptionController (/api/medicine-prescriptions,
// /api/encounters/{id}/medicine-prescription,
// /api/encounters/{id}/medicine-names) instead of Supabase
// (`medicine_prescriptions` + its `prescription_items` child table). Same
// rationale/pattern as utils/patients.js, utils/encounters.js, and
// utils/labOrders.js.

import { api } from "../lib/apiClient";
import { getPatientUuid } from "./patients";

// Full Active Ingredient list from the Philippine National Formulary (PNF),
// Essential Medicines List, Volume I, 8th Edition (as of November 02, 2022),
// Department of Health Pharmaceutical Division. Pure cross-reference entries
// ("X (see Y)") were folded into their real entry rather than listed twice.
// This is the complete official list, so it includes vaccines, IV fluids,
// contrast media, and other non-oral-Rx items alongside ordinary medicines —
// filter it down in the UI later if you only want outpatient-prescribable
// items in the picker. Kept as a static export (not fetched from Supabase's
// medicine_catalog table) — same convention as DIAGNOSTIC_OPTIONS in
// utils/labOrders.js, since this is a small, rarely-changing reference list.
export const MEDICINE_CATALOG = [
  // A
  "Abacavir",
  "Acetated Ringer's Solution",
  "Acetazolamide",
  "Acetylcysteine",
  "Aciclovir",
  "Activated Charcoal",
  "Adenosine",
  "Albendazole",
  "Albumin, Human",
  "Alcohol, Ethyl",
  "Alendronate (as sodium salt)",
  "Alendronate + Cholecalciferol (vitamin D3)",
  "Alfuzosin (as hydrochloride)",
  "All-in-one Admixtures",
  "Allopurinol",
  "Alprazolam",
  "Aluminum Hydroxide + Magnesium Hydroxide",
  "Amikacin (as sulfate)",
  "Amino Acid + Carbohydrate + Multivitamins + Electrolytes",
  "Amino Acid + Glucose + Electrolytes + Vitamin B1",
  "Amino Acid Solutions for Immunonutrition / Immunoenhancement",
  "Amino Acid Solutions for Infants",
  "Amino Acid Solutions for Renal Condition",
  "Amino Acid Solutions for Hepatic Failure",
  "Amino Acids, Crystalline Standard",
  "Aminophylline (theophylline ethylenediamine)",
  "Amiodarone (as hydrochloride)",
  "Amlodipine (as besilate/camsylate)",
  "Amoxicillin (as trihydrate)",
  "Amphotericin B (Lipid Complex)",
  "Amphotericin B (Non-Lipid Complex)",
  "Ampicillin (as sodium salt)",
  "Ampicillin + Sulbactam",
  "Anastrazole",
  "Anti-D Immunoglobulin (human)",
  "Antilymphocyte Immunoglobulin (ALG) (equine)",
  "Antithymocyte Immunoglobulin (ATG) (rabbit)",
  "Anti-rabies Serum (equine)",
  "Anti-tetanus Serum (equine)",
  "Aripiprazole",
  "Artemether + Lumefantrin",
  "Artesunate",
  "Ascorbic Acid (Vitamin C)",
  "Asparaginase",
  "Aspirin",
  "Atenolol",
  "Atorvastatin Calcium",
  "Atracurium (as besilate)",
  "Atropine (as sulfate)",
  "Azathioprine",
  "Azithromycin",
  "Aztreonam",

  // B
  "Bacitracin + Neomycin + Polymixin B",
  "Baclofen",
  "Balanced Multiple Maintenance Solution",
  "Balanced Multiple Replacement Solution",
  "Balanced Multiple Replacement Solution w/ pH 7.4",
  "Barium Sulfate",
  "Basiliximab",
  "BCG Vaccine",
  "Bedaquiline Fumarate",
  "Benzoyl Peroxide",
  "Benzyl Benzoate",
  "Beractant",
  "Betahistine (as hydrochloride/dihydrochloride)",
  "Betamethasone",
  "Betaxolol (as hydrochloride)",
  "Bicalutamide",
  "Biperiden",
  "Biphasic Isophane Human Insulin 70/30",
  "Bisacodyl",
  "Bisoprolol",
  "Bleomycin (as sulfate)",
  "Brimonidine (as tartrate)",
  "Brinzolamide",
  "Bromazepam",
  "Bromocriptine (as mesilate)",
  "Budesonide",
  "Budesonide + Formoterol",
  "Bumetanide",
  "Bupivacaine (as hydrochloride)",
  "Butamirate (as citrate)",
  "Butorphanol (as tartrate)",

  // C
  "Calamine, Plain",
  "Calcipotriol",
  "Calcipotriol + Betamethasone",
  "Calcitriol",
  "Calcium",
  "Calcium Carbonate",
  "Calcium Carbonate + Cholecalciferol (Vitamin D3)",
  "Calcium Folinate (Leucovorin Calcium)",
  "Calcium Gluconate",
  "Calcium Sennosides",
  "Capecitabine",
  "Capreomycin",
  "Captopril",
  "Carbachol",
  "Carbamazepine",
  "Carbetocin",
  "Carboplatin",
  "Carboprost",
  "Carboxymethylcellulose (as sodium)",
  "Carvedilol",
  "Castor Oil",
  "Cefalexin (as monohydrate)",
  "Cefazolin (as sodium salt)",
  "Cefepime (as hydrochloride)",
  "Cefixime",
  "Cefotaxime (as sodium salt)",
  "Cefoxitin",
  "Ceftaxidime (Ceftazidime)",
  "Ceftriaxone (as disodium/sodium salt)",
  "Cefuroxime",
  "Celecoxib",
  "Cetirizine (as dihydrochloride)",
  "Chlorambucil",
  "Chloramphenicol",
  "Chlorhexidine",
  "Chloroquine (as phosphate or diphosphate)",
  "Chlorphenamine (Chlorpheniramine) (as maleate)",
  "Chlorpromazine (as hydrochloride)",
  "Ciclosporin",
  "Cilostazol",
  "Cinnarizine",
  "Ciprofloxacin",
  "Cisplatin",
  "Clarithromycin",
  "Clindamycin",
  "Clobetasol (as propionate)",
  "Clofazimine",
  "Clomifene",
  "Clonazepam",
  "Clonidine",
  "Clopidogrel",
  "Clotrimazole",
  "Cloxacillin (as sodium salt)",
  "Clozapine",
  "Co-Amoxiclav (Amoxicillin + Potassium Clavulanate)",
  "Cobra Antivenin",
  "Codeine (as phosphate)",
  "Colchicine",
  "Colistin",
  "Combined Glucose-Amino Acid Solutions",
  "Conjugated Estrogen",
  "Cotrimoxazole (Sulfamethoxazole + Trimethoprim)",
  "Crotamiton",
  "Cyclophosphamide",
  "Cycloserine",
  "Cyproterone (as acetate)",
  "Cytarabine",

  // D
  "Dacarbazine",
  "Daclatasvir",
  "Dactinomycin",
  "Danazol",
  "Dantrolene (as sodium salt)",
  "Dapsone",
  "Deferiprone",
  "Deferasirox",
  "Deferoxamine (as mesilate)",
  "Delamanid",
  "Desflurane",
  "Desmopressin (as acetate)",
  "Dexamethasone",
  "Dextran, High Molecular Weight (Dextran 70)",
  "Dextromethorphan (as hydrobromide)",
  "5% Dextrose in 0.3% Sodium Chloride",
  "5% Dextrose in 0.45% Sodium Chloride",
  "5% Dextrose in 0.9% Sodium Chloride",
  "5% Dextrose in Lactated Ringer's",
  "5% Dextrose in Water",
  "10% Dextrose in Water",
  "Diazepam",
  "Diclofenac",
  "Dicycloverine (Dicyclomine) (as hydrochloride)",
  "Diethylcarbamazine",
  "Digoxin",
  "Diloxanide (as furoate)",
  "Diltiazem (as hydrochloride)",
  "Dimeglumine Gadopentetate",
  "Dimercaprol",
  "Dimercaptopropane-sulphonate (DMPS)",
  "Diphenhydramine (as hydrochloride)",
  "Diphtheria Antitoxin",
  "Diphtheria, Tetanus, Pertussis, Hepatitis B Recombinant and Haemophilus Influenzae Type B (Hib) Combined Vaccine",
  "Diphtheria-Tetanus Toxoids (DT)",
  "Diphtheria-Tetanus Toxoids (Td)",
  "Diphtheria-Tetanus Toxoids and Acellular Pertussis Vaccines (DTaP)",
  "Diphtheria-Tetanus Toxoids and Pertussis Vaccine (DTP)",
  "Dipyridamole",
  "Divalproex Sodium",
  "Sodium Valproate + Valproic Acid (Controlled Release)",
  "Dobutamine (as hydrochloride)",
  "Docetaxel",
  "Dolutegravir",
  "Domperidone",
  "Donepezil",
  "Dopamine (as hydrochloride)",
  "Dorzolamide",
  "Doxorubicin (as hydrochloride)",
  "Doxycycline (as hyclate)",
  "DTaP + Hib",
  "DTP + Hepatitis B Vaccine (recombinant)",
  "DTP + Hib",
  "DTP + Inactivated Polio Vaccine (IPV)",
  "DTP + IPV + Hib",
  "Dydrogesterone",

  // E
  "Efavirenz",
  "Emtricitabine + Tenofovir Disoproxil Fumarate",
  "Enalapril (as maleate)",
  "Enalapril + Hydrochlorothiazide",
  "Enoxaparin (as sodium salt)",
  "Entecavir",
  "Enteral Nutrition - Adult Polymeric",
  "Enteral Nutrition - Disease Specific",
  "Enteral Nutrition - Fiber Containing",
  "Enteral Nutrition - Modular",
  "Enteral Nutrition - Pediatric Polymeric",
  "Enteral Nutrition - Semi-Elemental",
  "Ephedrine",
  "Eperisone Hydrochloride",
  "Epinephrine (Adrenaline)",
  "Epirubicin (as hydrochloride)",
  "Epoetin Alfa (recombinant human erythropoietin)",
  "Epoetin Beta (recombinant erythropoietin)",
  "Ergotamine (as tartrate)",
  "Ertapenem (as sodium salt)",
  "Erythromycin",
  "Escitalopram (as oxalate)",
  "Esmolol (as hydrochloride)",
  "Ethambutol (as hydrochloride)",
  "Ethinylestradiol + Desogestrel",
  "Ethinylestradiol + Levonorgestrel",
  "Ethinylestradiol + Norethisterone",
  "Ethinylestradiol + Norgestrel",
  "Etonogestrel",
  "Etoposide",
  "Everolimus",

  // F
  "Factor IX Complex Concentrate (coagulation factors II, VII, IX, X)",
  "Factor VIII Concentrate",
  "Famotidine",
  "Felodipine",
  "Fenofibrate",
  "Fentanyl (as citrate)",
  "Ferrous Salt",
  "Ferrous Salt + Folic Acid",
  "Filgrastim (G-CSF)",
  "Finasteride",
  "Fluconazole",
  "Flucytosine (5-fluorocytosine)",
  "Flumazenil",
  "Flunarizine (as hydrochloride)",
  "Fluocinonide",
  "Fluorescein (as sodium salt)",
  "Fluorouracil",
  "Fluoxetine",
  "Flupentixol (as decanoate)",
  "Fluphenazine (as decanoate)",
  "Flutamide",
  "Fluticasone (as propionate)",
  "Fluticasone (as propionate) + Formoterol (as fumarate dihydrate)",
  "Fluticasone (as propionate) + Salmeterol (as xinafoate)",
  "Folic Acid",
  "Fomepizole (4-methylprazole)",
  "Fondaparinux (as sodium salt)",
  "Formoterol",
  "Fosfomycin",
  "Furosemide",
  "Fusidate Sodium / Fusidic Acid",

  // G
  "Gabapentin",
  "Gadobutrol",
  "Gadoteric Acid",
  "Ganciclovir",
  "Gas Forming Agent",
  "Gemcitabine (as hydrochloride)",
  "Gentamicin (as sulfate)",
  "Gliclazide",
  "Glucagon (as hydrochloride)",
  "Glucose (Dextrose)",
  "Glycerol (Glycerin)",
  "Glyceryl Trinitrate (Nitroglycerin)",
  "Goserelin (as acetate)",

  // H
  "Haloperidol",
  "Halothane",
  "Hemodialysis Solution",
  "Hemophilus Influenzae Type B Conjugated Vaccine (Hib)",
  "Heparin (unfractionated) (as sodium salt)",
  "Hepatitis A Inactivated Vaccine",
  "Hepatitis B Immunoglobulin (human)",
  "Hepatitis B Vaccine (recombinant DNA)",
  "Human Papillomavirus Quadrivalent (types 6, 11, 16, 18) Recombinant Vaccine",
  "Human Papillomavirus Vaccine Types 16 and 18 (Recombinant, AS04 Adjuvanted)",
  "Human Recombinant Tissue Type Plasminogen Activator (Alteplase)",
  "Hydralazine (as hydrochloride)",
  "Hydrochlorothiazide",
  "Hydrocortisone",
  "Hydrogen Peroxide",
  "Hydroxychloroquine (as sulfate)",
  "Hydroxyethyl Starch",
  "Hydroxyurea",
  "Hydroxyzine (as dihydrochloride)",
  "Hyoscine (as N-butyl bromide)",
  "Hypertonic Lactate",
  "3% Hypertonic Saline Solution",
  "Hypromellose",

  // I
  "Ibuprofen",
  "Idarubicin (as hydrochloride)",
  "Ifosfamide",
  "Imatinib (as mesilate)",
  "Imiglucerase",
  "Imiquimod",
  "Immunoglobulin Normal, Human (IGIM)",
  "Immunoglobulin Normal, Human (IGIV)",
  "Inactivated Polio Vaccine (Types 1, 2, and 3), Salk",
  "Inactivated Poliomyelitis Vaccine (Types 1, 2 and 3)",
  "Indacaterol (as maleate) + Glycopyrronium (as bromide)",
  "Indapamide",
  "Influenza Polyvalent Vaccine",
  "Insulin Glargine",
  "Interferon Alfa 2B (human)",
  "Intraocular Irrigating Solution (balanced salt solution)",
  "Iodine",
  "Iodixanol",
  "Iodized Oil Fluid",
  "Iohexol",
  "Iopamidol",
  "Iopromide",
  "Iothalamate",
  "Ioversol",
  "Ipratropium (as bromide)",
  "Ipratropium (as bromide) + Fenoterol (as hydrobromide)",
  "Ipratropium + Salbutamol",
  "Irbesartan",
  "Irbesartan + Hydrochlorothiazide",
  "Irinotecan (as hydrochloride)",
  "Iron Sucrose",
  "Isoflurane",
  "Isoniazid",
  "Isoniazid + Rifampicin",
  "Isoniazid + Rifampicin + Ethambutol",
  "Isoniazid + Rifampicin + Pyrazinamide",
  "Isoniazid + Rifampicin + Pyrazinamide + Ethambutol",
  "Isophane Insulin Human (recombinant DNA)",
  "Isosorbide Dinitrate",
  "Isosorbide-5-Mononitrate",
  "Isotonic Electrolyte Solution for IV Infusion",
  "Isoxsuprine (as hydrochloride)",
  "Itraconazole",
  "Ivermectin",

  // K
  "Kanamycin (as sulfate)",
  "Ketamine (as hydrochloride)",
  "Ketoconazole",
  "Ketoprofen",
  "Ketorolac (as tromethamol)",

  // L
  "Lactated Ringer's Solution (Ringer's Lactate)",
  "Lactulose",
  "Lagundi [Vitex negundo L.]",
  "Lamivudine",
  "Lamivudine + Efavirenz + Tenofovir",
  "Lamivudine + Tenofovir",
  "Lamivudine + Zidovudine",
  "Lamivudine + Zidovudine + Nevirapine",
  "Lamotrigine",
  "Lansoprazole",
  "Latanoprost",
  "Latanoprost + Timolol Maleate",
  "Letrozole",
  "Leuproreline (as acetate)",
  "Levetiracetam",
  "Levobupivacaine",
  "Levodopa + Carbidopa",
  "Levofloxacin",
  "Levothyroxine (as sodium/anhydrous sodium)",
  "Lidocaine (as hydrochloride)",
  "Linezolid",
  "Lipids",
  "Lithium Carbonate",
  "Live Attenuated Bivalent Oral Polio Vaccine (Type 1 and 3)",
  "Live Attenuated Measles Vaccine",
  "Live Attenuated Measles, Mumps and Rubella (MMR) Vaccine",
  "Live Attenuated Measles and Rubella (MR) Vaccine",
  "Live Attenuated Mumps Vaccine",
  "Live Attenuated Rubella Vaccine",
  "Live Attenuated Varicella Vaccine",
  "Loperamide (as hydrochloride)",
  "Lopinavir + Ritonavir",
  "Loratadine",
  "Losartan (as potassium salt)",
  "Losartan + Hydrochlorothiazide",
  "Lynestrenol",

  // M
  "Magnesium Sulfate (as heptahydrate)",
  "Mannitol",
  "Mebendazole",
  "Mebeverine (as hydrochloride)",
  "Mecobalamin",
  "Medroxyprogesterone",
  "Mefenamic Acid",
  "Mefloquine (as hydrochloride)",
  "Megestrol (as acetate)",
  "Melphalan",
  "Memantine",
  "Meningococcal Polysaccharide (Neisseria meningitidis) Vaccine",
  "Mercaptopurine",
  "Meropenem (as trihydrate)",
  "Mesalazine",
  "Mesna (sodium-2-mercaptoethanesulphonate)",
  "Metformin (as hydrochloride)",
  "Methimazole (Thiamazole)",
  "Methotrexate",
  "Methyldopa",
  "Methylene Blue",
  "Methylergometrine (Methylergonovine) (as hydrogen maleate or maleate)",
  "Methylphenidate",
  "Methylprednisolone",
  "Metoclopramide",
  "Metoprolol (as tartrate)",
  "Metronidazole",
  "Micafungin",
  "Miconazole",
  "Micronutrient Powder",
  "Midazolam",
  "Mitoxantrone",
  "Modified Fluid Gelatin (polymerisate of degraded succinylated gelatin)",
  "Monobasic/Dibasic Sodium Phosphate",
  "Montelukast (as sodium salt)",
  "Morphine (as sulfate)",
  "Moxifloxacin",
  "Multivitamins",
  "Mupirocin",
  "Mycophenolate Mofetil",
  "Mycophenolic Acid (as Mycophenolate Sodium)",

  // N
  "N-acetyl Penicillamine",
  "Nalbuphine (as hydrochloride)",
  "Nalidixic Acid",
  "Naloxone (as hydrochloride)",
  "Naltrexone (as hydrochloride)",
  "Naproxen (as sodium salt)",
  "Neomycin (as sulfate) + Polymixin B (as sulfate) + Fluocinolone Acetonide",
  "Neostigmine",
  "Nepafenac",
  "Nevirapine",
  "Nicardipine (as hydrochloride)",
  "Nicotine",
  "Nicotine Transdermal Therapeutic System",
  "Nifedipine",
  "Nimodipine",
  "Nitrofurantoin",
  "Nitrous Oxide",
  "Norepinephrine (as bitartrate)",
  "Norethisterone (as acetate and as base)",
  "Nystatin",

  // O
  "Octreotide (as acetate)",
  "Ofloxacin",
  "Olanzapine",
  "Olodaterol (as hydrochloride)",
  "Omeprazole",
  "Ondansetron",
  "Oral Rehydration Salts (ORS 75-replacement)",
  "Oseltamivir (as phosphate)",
  "Oxacillin (as sodium salt)",
  "Oxaliplatin",
  "Oxcarbazepine",
  "Oxycodone (as hydrochloride)",
  "Oxycodone (as hydrochloride) + Naloxone (as hydrochloride)",
  "Oxygen",
  "Oxymetazoline (as hydrochloride)",
  "Oxytocin (synthetic)",

  // P
  "Paclitaxel",
  "Paliperidone",
  "Pancuronium (as bromide)",
  "Pantoprazole",
  "Para-amino Salicylic Acid",
  "Paracetamol",
  "Peginterferon Alfa 2A",
  "Penicillin G Benzathine (benzathine benzylpenicillin)",
  "Penicillin G Crystalline (benzylpenicillin) (as sodium salt)",
  "Peritoneal Dialysis Solution",
  "Permethrin",
  "Pethidine (Meperidine) (as hydrochloride)",
  "Petrolatum/Petroleum",
  "Phenobarbital",
  "Phenoxymethyl Penicillin (Penicillin V) (as potassium salt)",
  "Phenylephrine (as hydrochloride)",
  "Phenytoin (as sodium salt)",
  "Phospholipid Fraction from Bovine Lung",
  "Physostigmine (as salicylate)",
  "Phytomenadione (Phytonadione, Vitamin K1)",
  "Pilocarpine (as hydrochloride)",
  "Piperacillin + Tazobactam (as sodium salt)",
  "Pneumococcal Conjugate Vaccine (PCV)",
  "Pneumococcal Polyvalent Vaccine",
  "Polymyxin B (as sulfate)",
  "Poractant Alfa",
  "Potassium (as citrate)",
  "Potassium Chloride",
  "Potassium Phosphate",
  "Povidone Iodine",
  "Pralidoxime Chloride",
  "Praziquantel",
  "Prednisolone",
  "Prednisone",
  "Primaquine (as diphosphate)",
  "Propofol",
  "Propranolol (as hydrochloride)",
  "Propylthiouracil",
  "Protamine Sulfate",
  "Prothionamide",
  "Proxymetacaine (Proparacaine) (as hydrochloride)",
  "Pyrazinamide",
  "Pyridostigmine (as bromide)",
  "Pyridoxine (Vitamin B6) (as hydrochloride)",
  "Pyrimethamine",

  // Q
  "Quetiapine (as fumarate)",
  "Quinine",

  // R
  "Rabeprazole Sodium",
  "Rabies Immunoglobulin (human)",
  "Rabies Vaccine, Chick Embryo Cell (purified, inactivated)",
  "Rabies Vaccine, Vero Cell (purified)",
  "Ranitidine (as hydrochloride)",
  "Regular, Insulin (recombinant DNA human)",
  "Remifentanil",
  "Retinol (Vitamin A) (as palmitate)",
  "Ribavirin",
  "Rifabutin",
  "Rifampicin",
  "Rifapentine",
  "Rifaximin",
  "Rilpivirine (as hydrochloride)",
  "Risperidone",
  "Rituximab",
  "Rivastigmine (as hydrogen tartrate)",
  "Rocuronium (as bromide)",
  "Ropivacaine (as hydrochloride)",
  "Rosuvastatin (as calcium salt)",

  // S
  "Sacubitril/Valsartan",
  "Salbutamol (as sulfate)",
  "Salicylic Acid",
  "Sambong [Blumea balsamifera (L) DC]",
  "Selegiline (as hydrochloride)",
  "Selenium Sulfide",
  "Sertraline (as hydrochloride)",
  "Sevelamer Carbonate",
  "Sevoflurane",
  "Silver Sulfadiazine",
  "Simvastatin",
  "Sirolimus",
  "Sodium Bicarbonate",
  "Sodium Calcium Edetate",
  "Sodium Chloride",
  "0.9% Sodium Chloride",
  "Sodium Dichloroisocyanurate (water purification)",
  "Sodium Hyaluronate",
  "Sodium Hypochlorite",
  "Sodium Iodide 131I",
  "Sodium Nitrite",
  "Sodium Nitroprusside",
  "Sodium Sulfate",
  "Sodium Thiosulfate",
  "Sodium Valproate",
  "Sofosbuvir",
  "Sofosbuvir + Ledipasvir",
  "Sofosbuvir + Velpatasvir",
  "Somatostatin",
  "Soya Bean Oil + Medium Chain Triglycerides + Olive Oil + Purified Fish Oil",
  "Spectinomycin",
  "Spironolactone (K-sparer)",
  "Standard Senna Concentrate",
  "Sterile Water for Injection",
  "Streptokinase",
  "Streptomycin (as sulfate)",
  "Succimer (Dimercapto Succinic Acid, DMSA)",
  "Sucralfate",
  "Sugammadex",
  "Sulfacetamide + Prednisolone",
  "Sulfur",
  "Sumatriptan",
  "Suxamethonium (Succinylcholine) (as chloride)",

  // T
  "Tacrolimus",
  "Tafluprost",
  "Tamoxifen (as citrate)",
  "Tamsulosin",
  "Tegafur + Uracil",
  "Telmisartan",
  "Telmisartan + Hydrochlorothiazide",
  "Tenofovir Alafenamide Fumarate",
  "Tenofovir Disoproxil Fumarate",
  "Tenofovir + Lamivudine + Dolutegravir",
  "Terazosin (as hydrochloride)",
  "Terbinafine",
  "Terbutaline (as sulfate)",
  "Testosterone (as undecanoate)",
  "Tetanus Immunoglobulin (human)",
  "Tetanus Toxoid",
  "Tetracaine",
  "Tetracycline",
  "Theophylline (anhydrous)",
  "Thiamine (Vitamin B1)",
  "Thiopental Sodium",
  "Timolol (as maleate)",
  "Tinzaparin (as sodium)",
  "Tiotropium (as bromide)",
  "Tobramycin",
  "Tobramycin + Dexamethasone",
  "Tocilizumab",
  "Tolvaptan",
  "Topiramate",
  "Trace Elements",
  "Tramadol (as hydrochloride)",
  "Tranexamic Acid",
  "Trastuzumab",
  "Travoprost",
  "Triclabendazole",
  "Trimetazidine (as hydrochloride)",
  "Tropicamide",
  "Tropicamide + Phenylephrine Hydrochloride",
  "Tsaang Gubat [Carmona retusa (Vahl) Masam]",
  "Tuberculin, Purified Protein Derivative (PPD)",
  "Typhoid Vaccine",

  // U
  "Ursodeoxycholic Acid",

  // V
  "Valaciclovir (as hydrochloride)",
  "Valganciclovir",
  "Valproic Acid",
  "Valsartan",
  "Valsartan + Hydrochlorothiazide",
  "Vancomycin (as hydrochloride)",
  "Varenicline",
  "Varicella Zoster Immunoglobulin (VZIG)",
  "Vasopressin",
  "Vecuronium (as bromide)",
  "Verapamil (as hydrochloride)",
  "Vinblastine (as sulfate)",
  "Vincristine (as sulfate)",
  "Vitamin B1 B6 B12",
  "Vitamin Intravenous, Fat-Soluble",
  "Vitamin Intravenous, Water-Soluble",
  "Voriconazole",

  // W
  "Warfarin (as sodium salt)",

  // Y
  "Yellow Fever Vaccine",

  // Z
  "Zidovudine",
  "Zidovudine + Lamivudine",
  "Zinc",
  "Zoledronic Acid",
  "Zolmitriptan",
  "Zolpidem",
];

// Mirrors encounters.STATUS's shape — a prescription is either still
// ACTIVE or has been CANCELLED. See the "medicine_prescriptions gets a
// status column" SQL addendum: the column defaults every existing/new row
// to ACTIVE, so nothing already in the table needs a backfill.
export const STATUS = {
  ACTIVE: "ACTIVE",
  CANCELLED: "CANCELLED",
};

export const STATUS_STYLES = {
  [STATUS.ACTIVE]: "bg-emerald-100 text-emerald-700",
  [STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

function rowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    hospitalNo: row.hospitalNo || "",
    encounterId: row.encounterId || null,
    patient: {
      firstName: row.patientFirstName || "",
      lastName: row.patientLastName || "",
      middleName: row.patientMiddleName || "",
      sex: row.patientSex || "",
      dateOfBirth: row.patientDateOfBirth || "",
      address: row.patientAddress || "",
    },
    prescribedBy: row.prescribedBy || "",
    status: row.status || STATUS.ACTIVE,
    items: (row.items || []).map((it) => ({
      medicineName: it.medicineName,
      quantity: it.quantity ?? 0,
      instructions: it.instructions || "",
      milligram: it.milligram || "",
    })),
    dateCreated: row.dateCreated,
  };
}

// The list endpoint is paginated (default 25/page) — this requests a
// large page size to approximate "load everything", same pattern
// utils/patients.js's loadPatients() uses. No status filter is passed, so
// this still returns both ACTIVE and CANCELLED prescriptions, same as
// before — the Archive page's "Cancelled Prescriptions" tab filters
// client-side against this same full list.
export async function loadMedicinePrescriptions() {
  const { data, error } = await api.get("/api/medicine-prescriptions?size=10000");
  if (error) {
    console.error("loadMedicinePrescriptions failed:", error.message);
    return [];
  }
  return (data.content || []).map(rowToRecord);
}

export async function findMedicinePrescriptionById(id) {
  const { data, error } = await api.get(`/api/medicine-prescriptions/${encodeURIComponent(id)}`);
  if (error) return null;
  return rowToRecord(data);
}

// Used by the Encounters table's Medication column — every medicine name
// prescribed under this exact encounter/registration, across however many
// prescriptions were created for it. The backend already returns a
// deduplicated list (DISTINCT medicineName across every prescription tied
// to this encounter), so no client-side Set dedup is needed anymore.
export async function getMedicineNamesForEncounter(encounterId) {
  if (!encounterId) return [];
  const { data, error } = await api.get(`/api/encounters/${encodeURIComponent(encounterId)}/medicine-names`);
  if (error) {
    console.error("getMedicineNamesForEncounter failed:", error.message);
    return [];
  }
  return data || [];
}

// The one prescription (if any) already tied to this registration —
// AddMedicinePrescriptionPage.jsx uses this to pre-fill the form when
// it's reopened for a registration that already has a prescription,
// instead of starting blank and risking a duplicate.
export async function findMedicinePrescriptionByEncounter(encounterId) {
  if (!encounterId) return null;
  const { data, error } = await api.get(`/api/encounters/${encodeURIComponent(encounterId)}/medicine-prescription`);
  if (error) {
    console.error("findMedicinePrescriptionByEncounter failed:", error.message);
    return null;
  }
  // MedicinePrescriptionService.getByEncounter() itself returns null when
  // nothing exists yet for this encounter (rather than a 404), so `data`
  // is already null in that case — no separate "not found" check needed.
  return rowToRecord(data);
}

// Creates a new prescription + its line items in one go. `record` is shaped
// exactly like AddMedicinePrescriptionPage.jsx already builds it (hospitalNo,
// encounterId, prescribedBy, items: [{medicineName, quantity, instructions}]).
export async function createMedicinePrescription(record) {
  const patientUuid = await getPatientUuid(record.hospitalNo);
  if (!patientUuid) throw new Error(`No patient found with Hospital No. "${record.hospitalNo}"`);

  // record.createdBy is accepted for signature compatibility with
  // existing call sites, but is no longer sent — the backend derives the
  // creator from the authenticated request (CurrentUserProvider) instead
  // of trusting a client-supplied id.
  const { data, error } = await api.post("/api/medicine-prescriptions", {
    patientId: patientUuid,
    encounterId: record.encounterId || null,
    prescribedBy: record.prescribedBy,
    items: (record.items || []).map((it) => ({
      medicineName: it.medicineName,
      quantity: it.quantity || 1,
      instructions: it.instructions || "",
      milligram: it.milligram || "",
    })),
  });
  if (error) throw new Error(error.message);

  return rowToRecord(data);
}

// Same job as createMedicinePrescription(), but scoped to a single
// registration (encounter) instead of always inserting a fresh
// prescription: submitting the Add Prescription page for the same
// registration multiple times only ever affects ONE prescription, syncing
// its prescribing physician and line items to match the form rather than
// stacking up a duplicate prescription per submit.
//
// `record.encounterId` is what "one prescription per registration" is
// keyed on — medicine_prescriptions.encounter_id has a unique index
// (uq_medicine_prescriptions_one_per_encounter) so at most one
// prescription can ever exist per encounter. When encounterId is null
// (the page was opened standalone, not from a specific registration —
// see AddMedicinePrescriptionPage.jsx), this just falls back to the old
// always-insert behavior, since there's no registration to scope an
// upsert to.
//
// The find-existing / update-prescriber / delete-and-reinsert-items logic
// that used to live here now lives entirely in
// MedicinePrescriptionService.upsertForEncounter() on the backend — this
// is a single PUT call.
export async function upsertMedicinePrescriptionForEncounter(record) {
  if (!record.encounterId) {
    return createMedicinePrescription(record);
  }

  const patientUuid = await getPatientUuid(record.hospitalNo);
  if (!patientUuid) throw new Error(`No patient found with Hospital No. "${record.hospitalNo}"`);

  const { data, error } = await api.put(
    `/api/encounters/${encodeURIComponent(record.encounterId)}/medicine-prescription`,
    {
      patientId: patientUuid,
      prescribedBy: record.prescribedBy,
      items: (record.items || []).map((it) => ({
        medicineName: it.medicineName,
        quantity: it.quantity || 1,
        instructions: it.instructions || "",
        milligram: it.milligram || "",
      })),
    }
  );
  if (error) throw new Error(error.message);

  return rowToRecord(data);
}

// Flips a prescription to CANCELLED — same shape as encounters' "Cancel"
// action. Line items are left exactly as they were; only the status flag
// changes, so the record still shows exactly what was prescribed, just
// marked cancelled instead of being deleted. Once cancelled, it shows up
// in the Archive page's "Cancelled Prescriptions" tab.
export async function cancelMedicinePrescription(id) {
  const { data, error } = await api.post(`/api/medicine-prescriptions/${encodeURIComponent(id)}/cancel`);
  if (error) throw new Error(error.message);
  return rowToRecord(data);
}

// Archive.jsx's "Delete Permanently" button on the Archived Medicine
// Prescriptions tab. Admin-only, and only allowed once the prescription
// is already CANCELLED — the backend enforces both (see
// MedicinePrescriptionService.deletePermanently) and returns a clear
// error message otherwise, which this throws.
export async function deleteMedicinePrescription(id) {
  const { error } = await api.del(`/api/medicine-prescriptions/${encodeURIComponent(id)}`);
  if (error) throw new Error(error.message);
}

// "2026-07-06T09:15:00.000Z" -> "07/06/2026" (matches the reference screen).
export function formatDateCreated(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const y = dt.getFullYear();
  return `${m}/${d}/${y}`;
}