package pl.piomin.samples.security.adminapi.web;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpStatusCodeException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import pl.piomin.samples.security.adminapi.keycloak.KeycloakAdminClient;

/**
 * Keycloak Authorization Services 의 resource / policy / permission 을 관리하고
 * 권한 평가를 시뮬레이션하는 API. Keycloak 표현(JSON)을 그대로 주고받는다.
 */
@RestController
@RequestMapping("/api")
public class AdminController {

	private static final String[] POLICY_TYPES = { "role", "regex", "time", "user", "group", "aggregate" };

	private final KeycloakAdminClient kc;
	private final ObjectMapper mapper;
	private final AntPathMatcher matcher = new AntPathMatcher();

	public AdminController(KeycloakAdminClient kc, ObjectMapper mapper) {
		this.kc = kc;
		this.mapper = mapper;
	}

	// ---- resources (API <-> resource 매핑) ----

	@GetMapping("/resources")
	public JsonNode resources() {
		return kc.get(kc.authz("/resource?deep=true&first=0&max=1000"));
	}

	@PostMapping("/resources")
	public JsonNode createResource(@RequestBody JsonNode body) {
		return kc.exchange(HttpMethod.POST, kc.authz("/resource"), body);
	}

	@PutMapping("/resources/{id}")
	public ResponseEntity<Void> updateResource(@PathVariable String id, @RequestBody JsonNode body) {
		kc.exchange(HttpMethod.PUT, kc.authz("/resource/" + id), body);
		return ResponseEntity.noContent().build();
	}

	@DeleteMapping("/resources/{id}")
	public ResponseEntity<Void> deleteResource(@PathVariable String id) {
		kc.exchange(HttpMethod.DELETE, kc.authz("/resource/" + id), null);
		return ResponseEntity.noContent().build();
	}

	// ---- policies (role / regex(ABAC claim) / time ...) ----

	@GetMapping("/policies")
	public JsonNode policies() {
		JsonNode basics = kc.get(kc.authz("/policy?permission=false&first=0&max=1000"));
		ArrayNode result = mapper.createArrayNode();
		for (JsonNode p : basics) {
			result.add(policyDetail(p));
		}
		return result;
	}

	@PostMapping("/policies/{type}")
	public JsonNode createPolicy(@PathVariable String type, @RequestBody JsonNode body) {
		return kc.exchange(HttpMethod.POST, kc.authz("/policy/" + checkType(type)), body);
	}

	@PutMapping("/policies/{type}/{id}")
	public ResponseEntity<Void> updatePolicy(@PathVariable String type, @PathVariable String id,
			@RequestBody JsonNode body) {
		kc.exchange(HttpMethod.PUT, kc.authz("/policy/" + checkType(type) + "/" + id), body);
		return ResponseEntity.noContent().build();
	}

	@DeleteMapping("/policies/{id}")
	public ResponseEntity<Void> deletePolicy(@PathVariable String id) {
		kc.exchange(HttpMethod.DELETE, kc.authz("/policy/" + id), null);
		return ResponseEntity.noContent().build();
	}

	// ---- permissions (resource + policies) ----

	@GetMapping("/permissions")
	public JsonNode permissions() {
		JsonNode basics = kc.get(kc.authz("/permission?first=0&max=1000"));
		ArrayNode result = mapper.createArrayNode();
		for (JsonNode p : basics) {
			ObjectNode o = p.deepCopy();
			String id = p.get("id").asText();
			o.set("resources", kc.get(kc.authz("/policy/" + id + "/resources")));
			o.set("policies", kc.get(kc.authz("/policy/" + id + "/associatedPolicies")));
			o.set("scopes", kc.get(kc.authz("/policy/" + id + "/scopes")));
			result.add(o);
		}
		return result;
	}

	@PostMapping("/permissions")
	public JsonNode createPermission(@RequestBody JsonNode body) {
		return kc.exchange(HttpMethod.POST, kc.authz("/permission/" + permissionKind(body)), body);
	}

	@PutMapping("/permissions/{id}")
	public ResponseEntity<Void> updatePermission(@PathVariable String id, @RequestBody JsonNode body) {
		kc.exchange(HttpMethod.PUT, kc.authz("/permission/" + permissionKind(body) + "/" + id), body);
		return ResponseEntity.noContent().build();
	}

	@DeleteMapping("/permissions/{id}")
	public ResponseEntity<Void> deletePermission(@PathVariable String id) {
		kc.exchange(HttpMethod.DELETE, kc.authz("/policy/" + id), null);
		return ResponseEntity.noContent().build();
	}

	// ---- lookup ----

	@GetMapping("/roles")
	public JsonNode roles() {
		return kc.get("/roles?first=0&max=500");
	}

	@GetMapping("/users")
	public JsonNode users(@RequestParam(defaultValue = "") String search) {
		return kc.get("/users?max=50&search=" + encode(search));
	}

	// ---- simulator ----

	/**
	 * 요청 URI/method 에 매칭되는 리소스를 찾아 Keycloak policy evaluation 을 수행한다.
	 * body: { userId, uri, method, attributes: { key: [values] } }
	 */
	@PostMapping("/evaluate")
	public JsonNode evaluate(@RequestBody JsonNode body) {
		String uri = body.path("uri").asText();
		String method = body.path("method").asText("GET").toUpperCase();

		ArrayNode matched = mapper.createArrayNode();
		for (JsonNode r : resources()) {
			for (JsonNode pattern : r.path("uris")) {
				if (uriMatches(pattern.asText(), uri)) {
					matched.add(r);
					break;
				}
			}
		}

		ObjectNode req = mapper.createObjectNode();
		req.put("userId", body.path("userId").asText());
		req.put("clientId", kc.targetClientUuid());
		req.put("entitlements", false);
		ArrayNode reqResources = req.putArray("resources");
		for (JsonNode r : matched) {
			ObjectNode rr = reqResources.addObject();
			rr.put("_id", r.get("_id").asText());
			rr.put("name", r.get("name").asText());
			rr.putArray("scopes").addObject().put("name", method);
		}
		ObjectNode attrs = req.putObject("context").putObject("attributes");
		if (body.has("attributes")) {
			attrs.setAll((ObjectNode) body.get("attributes"));
		}

		ObjectNode out = mapper.createObjectNode();
		out.set("matchedResources", matched);
		if (matched.size() == 0) {
			out.put("note", "No resource matches this URI (no Keycloak policy applies)");
			return out;
		}
		JsonNode eval = kc.exchange(HttpMethod.POST, kc.authz("/policy/evaluate"), req);
		out.set("results", eval.path("results"));
		return out;
	}

	// ---- helpers ----

	private boolean uriMatches(String pattern, String uri) {
		if (pattern.endsWith("/*") && uri.startsWith(pattern.substring(0, pattern.length() - 1))) {
			return true;
		}
		return matcher.match(pattern, uri);
	}

	private JsonNode policyDetail(JsonNode basic) {
		String type = basic.path("type").asText();
		String id = basic.get("id").asText();
		try {
			return kc.get(kc.authz("/policy/" + type + "/" + id));
		}
		catch (HttpStatusCodeException e) {
			return basic;
		}
	}

	private String checkType(String type) {
		for (String t : POLICY_TYPES) {
			if (t.equals(type)) {
				return type;
			}
		}
		throw new IllegalArgumentException("unsupported policy type: " + type);
	}

	/** scopes 가 지정되면 scope 기반, 아니면 resource 기반 permission. */
	private String permissionKind(JsonNode body) {
		return body.has("scopes") && body.get("scopes").size() > 0 ? "scope" : "resource";
	}

	private String encode(String s) {
		try {
			return java.net.URLEncoder.encode(s, "UTF-8");
		}
		catch (java.io.UnsupportedEncodingException e) {
			throw new IllegalStateException(e);
		}
	}

	@ExceptionHandler(HttpStatusCodeException.class)
	public ResponseEntity<String> keycloakError(HttpStatusCodeException e) {
		return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<String> badRequest(IllegalArgumentException e) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
	}
}
