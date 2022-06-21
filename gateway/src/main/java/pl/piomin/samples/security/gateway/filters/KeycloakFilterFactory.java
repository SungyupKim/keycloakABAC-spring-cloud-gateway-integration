package pl.piomin.samples.security.gateway.filters;


import java.util.List;
import java.util.Map;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;

import org.keycloak.authorization.client.AuthzClient;
import org.keycloak.representations.idm.authorization.AuthorizationRequest;
import org.keycloak.representations.idm.authorization.AuthorizationResponse;
import org.keycloak.representations.idm.authorization.ResourceRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@Component
public class KeycloakFilterFactory extends AbstractGatewayFilterFactory<Object> {
    private static final Logger LOGGER           = LoggerFactory.getLogger(KeycloakFilterFactory.class);

    public GatewayFilter apply() {
        return apply((Object) null);
    }


    @Override
    public GatewayFilter apply(Object config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            LOGGER.info("URI : " + request.getURI().getPath());
            HttpHeaders headers = request.getHeaders();
            for (Map.Entry<String, String> entry : headers.toSingleValueMap().entrySet()) {
                LOGGER.info(entry.getKey() + " : " + entry.getValue());
            }
            LOGGER.info("in keycloak filter!!!!!!!!!");
            String keycloakAccessToken = headers.getFirst("Authorization");
            LOGGER.info("keycloak access token : " + keycloakAccessToken);
            keycloakAccessToken = keycloakAccessToken.replaceFirst("Bearer ", "");
            AuthzClient authzClient = AuthzClient.create();
            List<ResourceRepresentation> response =
                    authzClient.protection(keycloakAccessToken)
                               .resource()
                               .findByMatchingUri(request.getURI().getPath());

            AuthorizationRequest req = new AuthorizationRequest();

            for (ResourceRepresentation resource : response) {
                LOGGER.info("name : " + resource.getId());
                req.addPermission(resource.getId(), "");
            }

            AuthorizationResponse resp = authzClient.authorization(keycloakAccessToken).authorize(req);
            LOGGER.error(resp.getError());
            LOGGER.info(resp.getToken());
            return chain.filter(exchange);
        };
    }
}
