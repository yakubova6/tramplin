package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.math.BigDecimal

@Entity
@Table(name = "location")
open class LocationDto : BaseLongIdEntity() {

    @Column(name = "city_id", nullable = false)
    var cityId: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id", insertable = false, updatable = false)
    var city: CityDto? = null

    @Column(name = "title", length = 255)
    var title: String? = null

    @Column(name = "address_line", nullable = false, length = 255)
    var addressLine: String = ""

    @Column(name = "address_line2", length = 255)
    var addressLine2: String? = null

    @Column(name = "postal_code", length = 20)
    var postalCode: String? = null

    @Column(name = "latitude")
    var latitude: BigDecimal? = null

    @Column(name = "longitude")
    var longitude: BigDecimal? = null

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true
}
