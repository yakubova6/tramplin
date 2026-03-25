package ru.itplanet.trampline.commons.exception

class OpportunityNotFoundException(id: Long) :
    RuntimeException("Public opportunity with id=$id was not found")
