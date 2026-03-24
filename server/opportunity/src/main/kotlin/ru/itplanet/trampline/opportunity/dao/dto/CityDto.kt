package ru.itplanet.trampline.opportunity.dao.dto

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal

@Entity
@Table(name = "city")
open class CityDto {

    @Id
    @Column(name = "id", nullable = false)
    var id: Long? = null

    @Column(name = "name", nullable = false, length = 150)
    var name: String = ""

    @Column(name = "region_name", nullable = false, length = 150)
    var regionName: String = ""

    @Column(name = "country_code", nullable = false, length = 2)
    var countryCode: String = ""

    @Column(name = "latitude")
    var latitude: BigDecimal? = null

    @Column(name = "longitude")
    var longitude: BigDecimal? = null

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true
}
