package ru.itplanet.trampline.interaction.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime

@Entity
@Table(
    name = "contact_recommendation",
    uniqueConstraints = [
        UniqueConstraint(
            columnNames = [
                "opportunity_id",
                "from_applicant_user_id",
                "to_applicant_user_id",
            ],
        ),
    ],
)
open class ContactRecommendationDto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "opportunity_id", nullable = false)
    open var opportunityId: Long = 0

    @Column(name = "from_applicant_user_id", nullable = false)
    open var fromApplicantUserId: Long = 0

    @Column(name = "to_applicant_user_id", nullable = false)
    open var toApplicantUserId: Long = 0

    @Column(name = "message")
    open var message: String? = null

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    constructor()

    constructor(
        opportunityId: Long,
        fromApplicantUserId: Long,
        toApplicantUserId: Long,
        message: String?,
    ) {
        this.opportunityId = opportunityId
        this.fromApplicantUserId = fromApplicantUserId
        this.toApplicantUserId = toApplicantUserId
        this.message = message
    }
}
