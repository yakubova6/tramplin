package ru.itplanet.trampline.geo.dao.dto

import jakarta.persistence.*
import ru.itplanet.trampline.commons.dao.dto.CityDto
import ru.itplanet.trampline.commons.dao.dto.LocationDto

@Entity
@Table(name = "opportunity")
open class GeoOpportunityDto(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    @Column
    var title: String,
    @Column(name="full_description")
    var fullDescription: String?,
    @Column(name="salary_from")
    var salaryFrom: Int?,
    @Column(name="salary_to")
    var salaryTo: Int?,
    @Column(name="salary_currency")
    var salaryCurrency: String?,
    @Column(name="type")
    var type: String?,
    @ManyToOne
    @JoinColumn(name = "employer_user_id")
    var employerProfile: EmployerProfileDto?,
    @ManyToOne
    @JoinColumn(name = "location_id")
    var location: LocationDto?,
    @ManyToOne
    @JoinColumn(name = "city_id")
    var city: CityDto?
)