package com.ezarate.hospital.modules.referencedata.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Read-only for most roles; Admin/Pharmacist can add/remove entries — see
// the @PreAuthorize on ReferenceDataController's create/delete endpoints,
// mirroring what used to be Supabase RLS on "medicines" feature access.
@Entity
@Table(name = "medicine_catalog")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MedicineCatalog {

    @Id
    @Column(length = 150)
    private String name;
}
