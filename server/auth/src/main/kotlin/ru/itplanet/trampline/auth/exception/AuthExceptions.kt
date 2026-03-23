package ru.itplanet.trampline.auth.exception

class UserAlreadyExistsException(
    message: String = "User with this email already exists"
) : RuntimeException(message)

class InvalidCredentialsException(
    message: String = "Invalid credentials"
) : RuntimeException(message)

class InvalidSessionException(
    message: String = "Invalid session"
) : RuntimeException(message)

class RegistrationRoleNotAllowedException(
    message: String = "Only applicant or employer can register"
) : RuntimeException(message)
