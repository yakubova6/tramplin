package ru.itplanet.trampline.interaction.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.OffsetDateTime

@Entity
@Table(name = "opportunity_response")
open class OpportunityResponseDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "applicant_user_id", nullable = false)
    open var applicantUserId: Long = 0

    @Column(name = "opportunity_id", nullable = false)
    open var opportunityId: Long = 0

    @Column(name = "cover_letter")
    open var coverLetter: String? = null

    @Column(name = "status", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    open var status: OpportunityResponseStatus = OpportunityResponseStatus.IN_REVIEW

    @Column(name = "employer_comment")
    open var employerComment: String? = null

    @Column(name = "applicant_comment")
    open var applicantComment: String? = null

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at")
    open var updatedAt: OffsetDateTime? = null

    @Column(name = "responded_at")
    open var respondedAt: OffsetDateTime? = null

    constructor() {}

    constructor(
        applicantUserId: Long,
        opportunityId: Long,
        employerComment: String? = null,
        applicantComment: String? = null,
        coverLetter: String? = null
    ) {
        this.applicantUserId = applicantUserId
        this.opportunityId = opportunityId
        employerComment?.let { this.employerComment = it }
        applicantComment?.let { this.applicantComment = it }
        coverLetter?.let { this.coverLetter = it }
    }
}

enum class OpportunityResponseStatus {
    SUBMITTED,
    IN_REVIEW,
    ACCEPTED,
    REJECTED,
    RESERVE,
    WITHDRAWN
}