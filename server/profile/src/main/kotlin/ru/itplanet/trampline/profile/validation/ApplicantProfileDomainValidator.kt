package ru.itplanet.trampline.profile.validation

import org.springframework.stereotype.Component
import ru.itplanet.trampline.profile.dao.dto.ApplicantProfileDto
import java.time.Year

@Component
class ApplicantProfileDomainValidator {

    fun validate(profile: ApplicantProfileDto) {
        validateCourse(profile)
        validateGraduationYear(profile)
        validateNames(profile)
        validateCity(profile)
    }

    private fun validateCourse(profile: ApplicantProfileDto) {
        profile.course?.let { course ->
            require(course in 1..6) {
                "Курс должен быть от 1 до 6, получено: $course"
            }
        }
    }

    private fun validateGraduationYear(profile: ApplicantProfileDto) {
        profile.graduationYear?.let { year ->
            val currentYear = Year.now().value
            require(year in 1900..(currentYear + 5)) {
                "Год окончания должен быть между 1900 и ${currentYear + 5}, получено: $year"
            }
        }
    }

    private fun validateNames(profile: ApplicantProfileDto) {
        require(!profile.firstName.isNullOrBlank()) {
            "Имя не может быть пустым"
        }
        require(!profile.lastName.isNullOrBlank()) {
            "Фамилия не может быть пустой"
        }
    }

    private fun validateCity(profile: ApplicantProfileDto) {
        profile.city?.let { city ->
            require(city.id != null && city.id!! > 0) {
                "Город должен быть сохранённым (id не может быть null или 0)"
            }
        }
    }
}