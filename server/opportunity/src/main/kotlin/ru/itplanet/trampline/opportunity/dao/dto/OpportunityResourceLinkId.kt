package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import java.io.Serializable

@Embeddable
data class OpportunityResourceLinkId(
    @Column(name = "opportunity_id", nullable = false)
    var opportunityId: Long = 0,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0
) : Serializable
