package pl.piomin.samples.security.adminapi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("keycloak")
public class KeycloakProperties {
	private String url;
	private String realm;
	private String issuer;
	private String clientId;
	private String clientSecret;
	private String targetClientId;
	private String adminRole;

	public String getUrl() { return url; }
	public void setUrl(String url) { this.url = url; }
	public String getRealm() { return realm; }
	public void setRealm(String realm) { this.realm = realm; }
	public String getIssuer() { return issuer; }
	public void setIssuer(String issuer) { this.issuer = issuer; }
	public String getClientId() { return clientId; }
	public void setClientId(String clientId) { this.clientId = clientId; }
	public String getClientSecret() { return clientSecret; }
	public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }
	public String getTargetClientId() { return targetClientId; }
	public void setTargetClientId(String targetClientId) { this.targetClientId = targetClientId; }
	public String getAdminRole() { return adminRole; }
	public void setAdminRole(String adminRole) { this.adminRole = adminRole; }
}
