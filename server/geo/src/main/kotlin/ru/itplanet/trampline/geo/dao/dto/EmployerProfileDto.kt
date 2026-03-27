package ru.itplanet.trampline.geo.dao.dto

import jakarta.persistence.*

@Entity
@Table(name = "employer_profile")
open class EmployerProfileDto(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    var companyName: String
)