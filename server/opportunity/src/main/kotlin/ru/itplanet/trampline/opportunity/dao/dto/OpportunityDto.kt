package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import ru.itplanet.trampline.opportunity.model.OpportunityContactInfo
import ru.itplanet.trampline.opportunity.model.enums.EmploymentType
import ru.itplanet.trampline.opportunity.model.enums.Grade
import ru.itplanet.trampline.opportunity.model.enums.OpportunityStatus
import ru.itplanet.trampline.opportunity.model.enums.OpportunityType
import ru.itplanet.trampline.opportunity.model.enums.WorkFormat
import java.time.LocalDate
import java.time.OffsetDateTime

@Entity
@Table(name = "opportunity")
open class OpportunityDto : BaseLongIdEntity() {

    @Column(name = "employer_user_id", nullable = false)
    var employerUserId: Long? = null

    @Column(name = "title", nullable = false, length = 200)
    var title: String = ""

    @Column(name = "short_description", nullable = false, length = 1000)
    var shortDescription: String = ""

    @Column(name = "full_description")
    var fullDescription: String? = null

    @Column(name = "requirements")
    var requirements: String? = null

    @Column(name = "company_name", nullable = false, length = 200)
    var companyName: String = ""

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 32)
    var type: OpportunityType = OpportunityType.VACANCY

    @Enumerated(EnumType.STRING)
    @Column(name = "work_format", nullable = false, length = 20)
    var workFormat: WorkFormat = WorkFormat.OFFICE

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", length = 20)
    var employmentType: EmploymentType? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "grade", length = 20)
    var grade: Grade? = null

    @Column(name = "salary_from")
    var salaryFrom: Int? = null

    @Column(name = "salary_to")
    var salaryTo: Int? = null

    @Column(name = "salary_currency", nullable = false, length = 3)
    var salaryCurrency: String = "RUB"

    @Column(name = "published_at")
    var publishedAt: OffsetDateTime? = null

    @Column(name = "expires_at")
    var expiresAt: OffsetDateTime? = null

    @Column(name = "event_date")
    var eventDate: LocalDate? = null

    @Column(name = "city_id")
    var cityId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id", insertable = false, updatable = false)
    var city: CityDto? = null

    @Column(name = "location_id")
    var locationId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", insertable = false, updatable = false)
    var location: LocationDto? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contact_info", nullable = false, columnDefinition = "jsonb")
    var contactInfo: OpportunityContactInfo = OpportunityContactInfo()

    @Column(name = "moderation_comment")
    var moderationComment: String? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    var status: OpportunityStatus = OpportunityStatus.DRAFT

    @OneToMany(
        mappedBy = "opportunity",
        fetch = FetchType.LAZY,
        cascade = [CascadeType.ALL],
        orphanRemoval = true
    )
    var resourceLinks: MutableList<OpportunityResourceLinkDto> = mutableListOf()

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "opportunity_tag",
        joinColumns = [JoinColumn(name = "opportunity_id")],
        inverseJoinColumns = [JoinColumn(name = "tag_id")]
    )
    var tags: MutableSet<TagDto> = linkedSetOf()

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime? = null
}
