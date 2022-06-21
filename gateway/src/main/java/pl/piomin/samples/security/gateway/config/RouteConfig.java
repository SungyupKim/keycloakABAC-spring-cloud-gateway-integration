package pl.piomin.samples.security.gateway.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder.Builder;
import org.springframework.cloud.security.oauth2.gateway.TokenRelayGatewayFilterFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.common.collect.Lists;

import pl.piomin.samples.security.gateway.filters.KeycloakFilterFactory;

@Component
public class RouteConfig {
	private static final Logger LOGGER = LoggerFactory.getLogger(RouteConfig.class);

	@Autowired
	TokenRelayGatewayFilterFactory tokenRelayFactory;
	@Autowired
	KeycloakFilterFactory keycloakFactory;
	@Autowired
	Environment env;

	private List<GatewayFilter> getFilterLists(){
		List<GatewayFilter> filters = Lists.newArrayList();
		filters.add(tokenRelayFactory.apply());
		filters.add(keycloakFactory.apply());
		return filters;
	}
    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
    	LOGGER.info("in routes");
        Builder routes = builder.routes();
        routes.route("keycloak-route", r -> r.path("/callme/**").filters(f->f.filters(getFilterLists())).uri("http://127.0.0.1:8040"));
        routes.route("keycloak-route2",
                     r -> r.path("/other/**").filters(f -> f.filters(getFilterLists())).uri("http://127.0.0.1:8040"));
        return routes.build();
    }
}