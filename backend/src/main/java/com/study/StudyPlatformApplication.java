package com.study;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing
public class StudyPlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(StudyPlatformApplication.class, args);
    }
}
