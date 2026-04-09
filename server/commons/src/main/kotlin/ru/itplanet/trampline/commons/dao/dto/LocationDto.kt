package ru.itplanet.trampline.commons.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
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

    @Column(name = "owner_employer_user_id")
    open var ownerEmployerUserId: Long? = null

    @Column(name = "title", length = 255)
    open var title: String? = null

    @Column(name = "address_line", nullable = false, length = 255)
    open var addressLine: String = ""

    @Column(name = "address_line2", length = 255)
    open var addressLine2: String? = null

    @Column(name = "postal_code", length = 20)
    open var postalCode: String? = null

    @Column(name = "fias_id", length = 36)
    open var fiasId: String? = null

    @Column(name = "unrestricted_value")
    open var unrestrictedValue: String? = null

    @Column(name = "qc_geo")
    open var qcGeo: Short? = null

    @Column(name = "source", length = 16)
    open var source: String? = null

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
        ownerEmployerUserId: Long? = null,
        title: String? = null,
        addressLine2: String? = null,
        postalCode: String? = null,
        fiasId: String? = null,
        unrestrictedValue: String? = null,
        qcGeo: Short? = null,
        source: String? = null,
        latitude: BigDecimal? = null,
        longitude: BigDecimal? = null,
    ) {
        this.cityId = cityId
        this.city = city
        this.addressLine = addressLine
        this.ownerEmployerUserId = ownerEmployerUserId
        this.title = title
        this.addressLine2 = addressLine2
        this.postalCode = postalCode
        this.fiasId = fiasId
        this.unrestrictedValue = unrestrictedValue
        this.qcGeo = qcGeo
        this.source = source
        this.latitude = latitude
        this.longitude = longitude
    }
}
