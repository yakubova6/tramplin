package ru.itplanet.trampline.interaction.exception

sealed class InteractionException(
    message: String,
) : RuntimeException(message) {
    class BadRequest(message: String) : InteractionException(message)

    class Conflict(message: String) : InteractionException(message)
}
