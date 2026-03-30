package ru.itplanet.trampline.auth.exception

class InvalidTwoFactorCodeException :
    RuntimeException("Invalid two-factor code")

class InvalidTwoFactorPendingTokenException :
    RuntimeException("Invalid or expired two-factor challenge")

class TwoFactorAlreadyEnabledException :
    RuntimeException("Two-factor authentication is already enabled")

class TwoFactorAlreadyDisabledException :
    RuntimeException("Two-factor authentication is already disabled")
