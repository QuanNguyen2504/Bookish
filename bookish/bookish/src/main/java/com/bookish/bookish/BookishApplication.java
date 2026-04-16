package com.bookish.bookish;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@EnableAsync
@SpringBootApplication
public class BookishApplication {

	public static void main(String[] args) {
		SpringApplication.run(BookishApplication.class, args);
	}

}
