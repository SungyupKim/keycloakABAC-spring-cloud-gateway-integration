
package pl.piomin.samples.security.gateway.errorhandler;


import java.nio.charset.StandardCharsets;

import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.web.server.ServerWebExchange;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;


/**
 * Class description
 *
 * @author sungyup.kim
 * @since 2022. 2. 3
 * @version 1.0
*/

public class ScgExceptionHandler implements ErrorWebExceptionHandler {
    private String errorMessageMaker(int errorCode, String descryption) {
        return "{\"errorCode\":" + errorCode + ", \"message\":" + descryption + "\"}";
    }


    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        int errorCode = 999;
        String descryption = "";
        if (ex.getClass() == org.keycloak.authorization.client.AuthorizationDeniedException.class) {
            errorCode = 403;
            descryption = "access denied";
        }

        byte[] bytes = errorMessageMaker(errorCode, descryption).getBytes(StandardCharsets.UTF_8);
        org.springframework.core.io.buffer.DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
        return exchange.getResponse().writeWith(Flux.just(buffer));
    }
}
