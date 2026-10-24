package pl.piomin.samples.security.adminapi.keycloak;

import java.time.Instant;
import java.util.Collections;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;

import pl.piomin.samples.security.adminapi.config.KeycloakProperties;

/**
 * 서비스 계정(client credentials) 토큰으로 Keycloak Admin REST API 를 호출하는 얇은 클라이언트.
 */
@Component
public class KeycloakAdminClient {

	private final KeycloakProperties props;
	private final RestTemplate rest = new RestTemplate();

	private String accessToken;
	private Instant expiresAt = Instant.EPOCH;
	private String targetClientUuid;

	public KeycloakAdminClient(KeycloakProperties props) {
		this.props = props;
	}

	/** 인가 서비스가 활성화된 대상 client 의 내부 UUID. */
	public synchronized String targetClientUuid() {
		if (targetClientUuid == null) {
			JsonNode clients = get("/clients?clientId=" + props.getTargetClientId());
			if (clients == null || clients.size() == 0) {
				throw new IllegalStateException("client not found: " + props.getTargetClientId());
			}
			targetClientUuid = clients.get(0).get("id").asText();
		}
		return targetClientUuid;
	}

	/** 대상 client 의 resource-server 하위 경로. */
	public String authz(String path) {
		return "/clients/" + targetClientUuid() + "/authz/resource-server" + path;
	}

	public JsonNode get(String path) {
		return exchange(HttpMethod.GET, path, null);
	}

	public JsonNode exchange(HttpMethod method, String path, JsonNode body) {
		HttpHeaders headers = new HttpHeaders();
		headers.setBearerAuth(token());
		headers.setContentType(MediaType.APPLICATION_JSON);
		String url = props.getUrl() + "/admin/realms/" + props.getRealm() + path;
		ResponseEntity<JsonNode> res = rest.exchange(
				UriComponentsBuilder.fromUriString(url).build(true).toUri(), method,
				new HttpEntity<>(body, headers), JsonNode.class);
		return res.getBody();
	}

	private synchronized String token() {
		if (accessToken != null && Instant.now().isBefore(expiresAt.minusSeconds(10))) {
			return accessToken;
		}
		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		form.put("grant_type", Collections.singletonList("client_credentials"));
		form.put("client_id", Collections.singletonList(props.getClientId()));
		form.put("client_secret", Collections.singletonList(props.getClientSecret()));
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
		JsonNode res = rest.postForObject(
				props.getIssuer() + "/protocol/openid-connect/token",
				new HttpEntity<>(form, headers), JsonNode.class);
		accessToken = res.get("access_token").asText();
		expiresAt = Instant.now().plusSeconds(res.get("expires_in").asLong());
		return accessToken;
	}
}
