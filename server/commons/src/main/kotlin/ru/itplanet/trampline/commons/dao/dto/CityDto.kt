package ru.itplanet.trampline.commons.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.locationtech.jts.geom.Point
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

    @Column(name = "fias_id", length = 36)
    open var fiasId: String? = null

    @Column(name = "latitude")
    open var latitude: BigDecimal? = null

    @Column(name = "longitude")
    open var longitude: BigDecimal? = null

    @Column(name = "is_active", nullable = false)
    open var isActive: Boolean = true

    @Column(name = "city_point", insertable = false, updatable = false)
    open var cityPoint: Point? = null

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
        fiasId: String? = null,
        latitude: BigDecimal? = null,
        longitude: BigDecimal? = null,
    ) {
        this.name = name
        this.regionName = regionName
        this.countryCode = countryCode
        this.fiasId = fiasId
        this.latitude = latitude
        this.longitude = longitude
    }
}
