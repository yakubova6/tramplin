package ru.itplanet.trampline.opportunity.model

import ru.itplanet.trampline.opportunity.model.enums.OpportunityType

data class OpportunityMapPoint(
    val id: Long,
    val type: OpportunityType,
    val title: String,
    val companyName: String,
    val salaryFrom: Int?,
    val salaryTo: Int?,
    val salaryCurrency: String,
    val cityName: String?,
    val addressLine: String?,
    val latitude: Double?,
    val longitude: Double?,
    val preview: OpportunityMarkerPreview
)
