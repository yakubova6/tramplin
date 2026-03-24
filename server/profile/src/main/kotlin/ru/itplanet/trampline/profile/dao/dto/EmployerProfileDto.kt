package ru.itplanet.trampline.profile.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import ru.itplanet.trampline.commons.dao.dto.UserDto
import ru.itplanet.trampline.profile.model.VerificationStatus
import java.time.OffsetDateTime

@Entity
@Table(name = "employer_profile")
open class EmployerProfileDto {

    @Id
    @Column(name = "user_id")
    open var userId: Long = 0

    @Column(name = "company_name", length = 255)
    open var companyName: String = ""

    @Column(name = "legal_name", length = 255)
    open var legalName: String? = null

    @Column(name = "inn", length = 12, unique = true)
    open var inn: String = ""

    @Column(name = "description")
    open var description: String? = null

    @Column(name = "industry", length = 255)
    open var industry: String? = null

    @Column(name = "website_url")
    open var websiteUrl: String? = null

    @Column(name = "social_links", columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    open var socialLinks: Map<String, String> = emptyMap()

    @Column(name = "public_contacts", columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    open var publicContacts: Map<String, String> = emptyMap()

    @Column(name = "company_size", length = 64)
    open var companySize: String? = null

    @Column(name = "founded_year")
    open var foundedYear: Short? = null


    @Column(name = "city_id")
    open var cityId: Long? = null

    @Column(name = "location_id")
    open var locationId: Long? = null

    @Column(name = "verification_status", length = 32, nullable = false)
    @Enumerated(EnumType.STRING)
    open var verificationStatus: VerificationStatus = VerificationStatus.PENDING

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
        companyName: String,
        legalName: String? = null,
        inn: String,
        description: String? = null,
        industry: String? = null,
        websiteUrl: String? = null,
        socialLinks: Map<String, String> = emptyMap(),
        publicContacts: Map<String, String> = emptyMap(),
        companySize: String? = null,
        foundedYear: Short? = null,
        cityId: Long? = null,
        locationId: Long? = null,
        verificationStatus: VerificationStatus = VerificationStatus.PENDING,
        createdAt: OffsetDateTime? = null,
        updatedAt: OffsetDateTime? = null
    ) {
        this.userId = userId
        this.companyName = companyName
        this.legalName = legalName
        this.inn = inn
        this.description = description
        this.industry = industry
        this.websiteUrl = websiteUrl
        this.socialLinks = socialLinks
        this.publicContacts = publicContacts
        this.companySize = companySize
        this.foundedYear = foundedYear
        this.cityId = cityId
        this.locationId = locationId
        this.verificationStatus = verificationStatus
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }
}
