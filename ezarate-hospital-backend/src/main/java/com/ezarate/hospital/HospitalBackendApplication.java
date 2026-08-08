package com.ezarate.hospital;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point. Deliberately empty besides the bootstrap call —
 * controllers/services/entities will be added module by module
 * under com.ezarate.hospital.modules.*
 */
@SpringBootApplication
public class HospitalBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(HospitalBackendApplication.class, args);
    }

}
