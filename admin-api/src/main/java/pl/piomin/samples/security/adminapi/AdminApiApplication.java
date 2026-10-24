package pl.piomin.samples.security.adminapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import pl.piomin.samples.security.adminapi.config.KeycloakProperties;

@SpringBootApplication
@EnableConfigurationProperties(KeycloakProperties.class)
public class AdminApiApplication {
	public static void main(String[] args) {
		SpringApplication.run(AdminApiApplication.class, args);
	}
}
