package ru.itplanet.trampline.interaction.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import ru.itplanet.trampline.commons.model.profile.ApplicantProfileModerationStatus
import java.time.OffsetDateTime

@Entity
@Table(name = "applicant_profile")
class ContactInfoApplicantProfileDto {
    @Id
    @Column(name = "user_id")
    open var userId: Long = 0

    @Column(name = "first_name", length = 100)
    open var firstName: String = ""

    @Column(name = "last_name", length = 100)
    open var lastName: String = ""

    @Column(name = "middle_name", length = 100)
    open var middleName: String? = null

    @Column(name = "moderation_status", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    open var moderationStatus: ApplicantProfileModerationStatus = ApplicantProfileModerationStatus.DRAFT

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at")
    open var updatedAt: OffsetDateTime? = null

    constructor()

    constructor(userId: Long) {
        this.userId = userId
    }

    constructor(
        userId: Long,
        firstName: String,
        lastName: String,
        middleName: String? = null,
        moderationStatus: ApplicantProfileModerationStatus = ApplicantProfileModerationStatus.DRAFT,
        createdAt: OffsetDateTime? = null,
        updatedAt: OffsetDateTime? = null
    ) {
        this.userId = userId
        this.firstName = firstName
        this.lastName = lastName
        this.middleName = middleName
        this.moderationStatus = moderationStatus
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }
}
