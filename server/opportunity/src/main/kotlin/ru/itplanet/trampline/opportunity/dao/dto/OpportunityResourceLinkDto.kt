package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.MapsId
import jakarta.persistence.Table
import jakarta.persistence.Column
import ru.itplanet.trampline.opportunity.model.enums.ResourceLinkType

@Entity
@Table(name = "opportunity_resource_link")
open class OpportunityResourceLinkDto {

    @EmbeddedId
    var id: OpportunityResourceLinkId = OpportunityResourceLinkId()

    @MapsId("opportunityId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunity_id", nullable = false)
    var opportunity: OpportunityDto? = null

    @Column(name = "label", nullable = false, length = 100)
    var label: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "link_type", nullable = false, length = 32)
    var linkType: ResourceLinkType = ResourceLinkType.RESOURCE

    @Column(name = "url", nullable = false)
    var url: String = ""
}
