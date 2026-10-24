package pl.piomin.samples.security.adminapi.config;

import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@org.springframework.context.annotation.Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {

	private final KeycloakProperties props;
	private final List<String> allowedOrigins;

	public SecurityConfig(KeycloakProperties props,
			@Value("${admin-console.allowed-origins}") List<String> allowedOrigins) {
		this.props = props;
		this.allowedOrigins = allowedOrigins;
	}

	@Override
	protected void configure(HttpSecurity http) throws Exception {
		http.cors().and().csrf().disable()
			.authorizeRequests()
				.antMatchers(HttpMethod.OPTIONS, "/**").permitAll()
				.anyRequest().hasRole("ADMIN")
			.and()
			.oauth2ResourceServer().jwt().jwtAuthenticationConverter(jwtConverter());
	}

	/** realm_access.roles 의 admin role 을 ROLE_ADMIN 으로 매핑한다. */
	private Converter<Jwt, AbstractAuthenticationToken> jwtConverter() {
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(jwt -> {
			Object realmAccess = jwt.getClaim("realm_access");
			if (!(realmAccess instanceof Map)) {
				return Collections.<GrantedAuthority>emptyList();
			}
			Object roles = ((Map<?, ?>) realmAccess).get("roles");
			if (!(roles instanceof Collection)) {
				return Collections.<GrantedAuthority>emptyList();
			}
			return ((Collection<?>) roles).stream()
				.filter(r -> props.getAdminRole().equals(r))
				.map(r -> new SimpleGrantedAuthority("ROLE_ADMIN"))
				.collect(Collectors.<GrantedAuthority>toList());
		});
		return converter;
	}

	@Bean
	public JwtDecoder jwtDecoder(@Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
		OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
				JwtValidators.createDefaultWithIssuer(props.getIssuer()));
		decoder.setJwtValidator(validator);
		return decoder;
	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration cfg = new CorsConfiguration();
		cfg.setAllowedOrigins(allowedOrigins);
		cfg.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		cfg.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", cfg);
		return source;
	}
}
