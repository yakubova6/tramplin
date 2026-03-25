package ru.itplanet.trampline.profile.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import ru.itplanet.trampline.profile.model.enums.VerificationMethod
import ru.itplanet.trampline.profile.model.enums.VerificationStatus
import java.time.OffsetDateTime

@Entity
@Table(name = "employer_verification")
open class EmployerVerificationDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "employer_user_id", nullable = false)
    open var employerUserId: Long = 0

    @Column(name = "status", length = 32, nullable = false)
    @Enumerated(EnumType.STRING)
    open var status: VerificationStatus = VerificationStatus.PENDING

    @Column(name = "verification_method", length = 32, nullable = false)
    @Enumerated(EnumType.STRING)
    open var verificationMethod: VerificationMethod? = null

    @Column(name = "corporate_email", length = 255)
    open var corporateEmail: String? = null

    @Column(name = "inn", length = 12)
    open var inn: String? = null

    @Column(name = "professional_links", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    open var professionalLinks: List<String> = emptyList()

    @Column(name = "submitted_comment")
    open var submittedComment: String? = null

    @Column(name = "review_comment")
    open var reviewComment: String? = null

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    open var submittedAt: OffsetDateTime? = null

    @Column(name = "reviewed_at")
    open var reviewedAt: OffsetDateTime? = null

    @Column(name = "reviewed_by_user_id")
    open var reviewedByUserId: Long? = null

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at")
    open var updatedAt: OffsetDateTime? = null

    constructor() {}

    constructor(
        employerUserId: Long,
        verificationMethod: VerificationMethod,
        corporateEmail: String?,
        inn: String?,
        professionalLinks: List<String>,
        submittedComment: String?
    ) {
        this.employerUserId = employerUserId
        this.verificationMethod = verificationMethod
        this.corporateEmail = corporateEmail
        this.inn = inn
        this.professionalLinks = professionalLinks
        this.submittedComment = submittedComment
    }
}