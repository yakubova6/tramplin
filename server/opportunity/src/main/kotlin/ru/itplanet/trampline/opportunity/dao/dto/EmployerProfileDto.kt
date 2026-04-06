package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.dao.dto.LocationDto
import java.time.OffsetDateTime

@Entity
@Table(name = "employer_profile")
open class EmployerProfileDto {

    @Id
    @Column(name = "user_id")
    open var userId: Long = 0

    @Column(name = "company_name", length = 255)
    open var companyName: String? = null

    @Column(name = "legal_name", length = 255)
    open var legalName: String? = null

    @Column(name = "inn", length = 12, unique = true)
    open var inn: String? = null

    @Column(name = "description")
    open var description: String? = null

    @Column(name = "industry", length = 255)
    open var industry: String? = null

    @Column(name = "website_url")
    open var websiteUrl: String? = null

    @Column(name = "company_size", length = 64)
    open var companySize: String? = null

    @Column(name = "founded_year")
    open var foundedYear: Short? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id")
    open var city: CityDto? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    open var location: LocationDto? = null

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
        companyName: String?,
        legalName: String? = null,
        inn: String?,
        description: String? = null,
        industry: String? = null,
        websiteUrl: String? = null,
        companySize: String? = null,
        foundedYear: Short? = null,
        city: CityDto? = null,
        location: LocationDto? = null,
        createdAt: OffsetDateTime? = null,
        updatedAt: OffsetDateTime? = null,
    ) {
        this.userId = userId
        this.companyName = companyName
        this.legalName = legalName
        this.inn = inn
        this.description = description
        this.industry = industry
        this.websiteUrl = websiteUrl
        this.companySize = companySize
        this.foundedYear = foundedYear
        this.city = city
        this.location = location
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }
}
