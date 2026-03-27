package ru.itplanet.trampline.commons.dao.dto

import jakarta.persistence.*
import org.locationtech.jts.geom.Point
import java.math.BigDecimal

@Entity
@Table(name = "location")
open class LocationDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @Column(name = "city_id", nullable = false)
    open var cityId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id", insertable = false, updatable = false)
    open var city: CityDto? = null

    @Column(name = "title", length = 255)
    open var title: String? = null

    @Column(name = "address_line", nullable = false, length = 255)
    open var addressLine: String = ""

    @Column(name = "address_line2", length = 255)
    open var addressLine2: String? = null

    @Column(name = "postal_code", length = 20)
    open var postalCode: String? = null

    @Column(name = "latitude")
    open var latitude: BigDecimal? = null

    @Column(name = "longitude")
    open var longitude: BigDecimal? = null

    @Column(name = "is_active", nullable = false)
    open var isActive: Boolean = true

    @Column(name = "location_point", insertable = false, updatable = false)
    open var locationPoint: Point? = null

    constructor()

    constructor(
        cityId: Long?,
        city: CityDto?,
        addressLine: String,
        title: String? = null,
        addressLine2: String? = null,
        postalCode: String? = null,
        latitude: BigDecimal? = null,
        longitude: BigDecimal? = null
    ) {
        this.cityId = cityId
        this.city = city
        this.addressLine = addressLine
        this.title = title
        this.addressLine2 = addressLine2
        this.postalCode = postalCode
        this.latitude = latitude
        this.longitude = longitude
    }
}
