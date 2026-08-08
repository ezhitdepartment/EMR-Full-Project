package com.ezarate.hospital.modules.referencedata.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Read-only reference table (V2__reference_data.sql). Standing in until
// admin/Users.jsx grows a real physicians directory — swap encounters.doctor
// for a doctor_id FK into this table (or into users) once that's built.
@Entity
@Table(name = "doctors_directory")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DoctorsDirectory {

    @Id
    @Column(length = 150)
    private String name;
}
