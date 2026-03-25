package ru.itplanet.trampline.commons.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.math.BigDecimal
import java.time.OffsetDateTime

@Entity
@Table(name = "city")
open class CityDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "name", length = 150, nullable = false)
    open var name: String = ""

    @Column(name = "region_name", length = 150, nullable = false, columnDefinition = "varchar(150) default ''")
    open var regionName: String = ""

    @Column(name = "country_code", length = 2, nullable = false)
    open var countryCode: String = ""

    @Column(name = "latitude", precision = 9, scale = 6)
    open var latitude: BigDecimal? = null

    @Column(name = "longitude", precision = 9, scale = 6)
    open var longitude: BigDecimal? = null

    @Column(name = "is_active", nullable = false)
    open var isActive: Boolean = true

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    open var updatedAt: OffsetDateTime? = null

    constructor()

    constructor(
        name: String,
        regionName: String,
        countryCode: String,
        latitude: BigDecimal? = null,
        longitude: BigDecimal? = null
    ) {
        this.name = name
        this.regionName = regionName
        this.countryCode = countryCode
        this.latitude = latitude
        this.longitude = longitude
    }
}