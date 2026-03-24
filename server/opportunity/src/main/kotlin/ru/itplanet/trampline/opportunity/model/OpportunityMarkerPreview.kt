package ru.itplanet.trampline.opportunity.model

import ru.itplanet.trampline.opportunity.model.enums.WorkFormat

data class OpportunityMarkerPreview(
    val title: String,
    val companyName: String,
    val shortDescription: String,
    val workFormat: WorkFormat,
    val salaryFrom: Int?,
    val salaryTo: Int?,
    val salaryCurrency: String,
    val tags: List<Tag>
)
