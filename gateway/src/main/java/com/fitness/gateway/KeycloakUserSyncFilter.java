package com.fitness.gateway;

import com.fitness.gateway.user.RegisterRequest;
import com.fitness.gateway.user.UserService;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.text.ParseException;

@Component
@Slf4j
@RequiredArgsConstructor
public class KeycloakUserSyncFilter implements WebFilter {
    
    private final UserService userService;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        if (isAuthPath(path)) {
            return chain.filter(exchange);
        }

        String userId = exchange.getRequest().getHeaders().getFirst("X-User-ID");
        String token = exchange.getRequest().getHeaders().getFirst("Authorization");
        RegisterRequest registerRequest = getUserDetails(token);
        userId = resolveUserId(userId, registerRequest);

        if (userId != null && token != null) {
            String finalUserId = userId;
            return syncUserIfNeeded(userId, registerRequest)
                    .then(Mono.defer(() -> chain.filter(withUserIdHeader(exchange, finalUserId))));
        }

        return chain.filter(exchange);
    }

    private boolean isAuthPath(String path) {
        return path.startsWith("/api/auth/");
    }

    private String resolveUserId(String userId, RegisterRequest registerRequest) {
        if (userId == null) {
            return registerRequest.getKeycloakId();
        }

        return userId;
    }

    private Mono<Void> syncUserIfNeeded(String userId, RegisterRequest registerRequest) {
        return userService.validateUser(userId)
                .flatMap(exist -> {
                    if (!exist) {
                        if (registerRequest != null) {
                            return userService.registerUser(registerRequest)
                                    .then(Mono.empty());
                        }

                        return Mono.empty();
                    }

                    log.info("User already exist, Skipping sync");
                    return Mono.empty();
                });
    }

    private ServerWebExchange withUserIdHeader(ServerWebExchange exchange, String userId) {
        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-User-ID", userId)
                .build();

        return exchange.mutate().request(mutatedRequest).build();
    }

    private RegisterRequest getUserDetails(String token) {
        try {
            String tokenWithoutBearer = token.replace("Bearer", "").trim();
            SignedJWT signedJWT = SignedJWT.parse(tokenWithoutBearer);
            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

            RegisterRequest request = new RegisterRequest();
            request.setEmail(claims.getStringClaim("email"));
            request.setKeycloakId(claims.getStringClaim("sub"));
            request.setFirstName(claims.getStringClaim("given_name"));
            request.setLastName(claims.getStringClaim("family_name"));
            request.setPassword("dummy@123123");

            return request;
        } catch (ParseException e) {
            throw new RuntimeException(e);
        }
    }
}
