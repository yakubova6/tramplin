package ru.itplanet.trampline.commons.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.math.BigDecimal
import java.time.OffsetDateTime

@Entity
@Table(name = "location")
open class LocationDto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id", nullable = false)
    open var city: CityDto? = null

    @Column(name = "title", length = 255)
    open var title: String? = null

    @Column(name = "address_line", length = 255, nullable = false)
    open var addressLine: String = ""

    @Column(name = "address_line2", length = 255)
    open var addressLine2: String? = null

    @Column(name = "postal_code", length = 20)
    open var postalCode: String? = null

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
        city: CityDto?,
        addressLine: String,
        title: String? = null,
        addressLine2: String? = null,
        postalCode: String? = null,
        latitude: BigDecimal? = null,
        longitude: BigDecimal? = null
    ) {
        this.city = city
        this.addressLine = addressLine
        this.title = title
        this.addressLine2 = addressLine2
        this.postalCode = postalCode
        this.latitude = latitude
        this.longitude = longitude
    }
}