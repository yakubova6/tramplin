package ru.itplanet.trampline.opportunity.model

import ru.itplanet.trampline.opportunity.model.enums.ResourceLinkType

data class OpportunityResourceLink(
    val sortOrder: Int,
    val label: String,
    val linkType: ResourceLinkType,
    val url: String
)
