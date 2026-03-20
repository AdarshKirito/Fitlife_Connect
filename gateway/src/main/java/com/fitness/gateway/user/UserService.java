package com.fitness.gateway.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    private static final String USER_NOT_FOUND_MESSAGE = "User not found : ";
    private static final String INVALID_USER_MESSAGE = "Invalid : ";
    private static final String UNEXPECTED_USER_ERROR_MESSAGE = "Unexpected error : ";
    private static final String BAD_REQUEST_MESSAGE = "Bad request : ";

    private final WebClient userServiceWebClient;

    public Mono<Boolean> validateUser(String userId) {
        log.info("Calling User Service for {}", userId);
        return userServiceWebClient.get()
                .uri("/api/users/{userId}/validate", userId)
                .retrieve()
                .bodyToMono(Boolean.class)
                .onErrorResume(WebClientResponseException.class, e -> handleValidateUserError(e, userId));
    }

    public Mono<UserResponse> registerUser(RegisterRequest registerRequest) {
        log.info("Calling User Registration for {}", registerRequest.getEmail());
        return userServiceWebClient.post()
                .uri("/api/users/register")
                .bodyValue(registerRequest)
                .retrieve()
                .bodyToMono(UserResponse.class)
                .onErrorResume(WebClientResponseException.class, this::handleRegisterUserError);
    }

    private Mono<Boolean> handleValidateUserError(WebClientResponseException error, String userId) {
        if (error.getStatusCode() == HttpStatus.NOT_FOUND) {
            return Mono.error(new RuntimeException(USER_NOT_FOUND_MESSAGE + userId));
        }

        if (error.getStatusCode() == HttpStatus.BAD_REQUEST) {
            return Mono.error(new RuntimeException(INVALID_USER_MESSAGE + userId));
        }

        return Mono.error(new RuntimeException(UNEXPECTED_USER_ERROR_MESSAGE + userId));
    }

    private Mono<UserResponse> handleRegisterUserError(WebClientResponseException error) {
        if (error.getStatusCode() == HttpStatus.BAD_REQUEST) {
            return Mono.error(new RuntimeException(BAD_REQUEST_MESSAGE + error.getMessage()));
        }

        return Mono.error(new RuntimeException(UNEXPECTED_USER_ERROR_MESSAGE + error.getMessage()));
    }
}
