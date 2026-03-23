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

class UserNotFoundException(
    message: String = "User not found"
) : RuntimeException(message)

class UserStatusChangeNotAllowedException(
    message: String = "Status change is not allowed"
) : RuntimeException(message)

class UserStatusTransitionNotAllowedException(
    message: String = "Status transition is not allowed"
) : RuntimeException(message)
