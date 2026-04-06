package ru.itplanet.trampline.profile.validation

import org.springframework.stereotype.Component
import ru.itplanet.trampline.profile.dao.dto.EmployerProfileDto
import ru.itplanet.trampline.profile.model.enums.ContactType

@Component
class EmployerProfileDomainValidator {

    fun validate(profile: EmployerProfileDto) {
        validateCompanyName(profile)
        validateInn(profile)
        validateWebsite(profile)
        validateYear(profile)
        validateCityAndLocation(profile)
        validateSocialLinks(profile)
        validatePublicContacts(profile)
    }

    private fun validateCompanyName(profile: EmployerProfileDto) {
        profile.companyName?.let {
            require(it.isNotBlank()) {
                "Название компании не может быть пустым"
            }
        }
        require(profile.companyName?.length!! <= 100) {
            "Название компании не должно превышать 100 символов"
        }
    }

    private fun validateInn(profile: EmployerProfileDto) {
        profile.inn?.let { inn ->
            require(inn.matches(Regex("^\\d{10}|\\d{12}$"))) {
                "ИНН должен содержать 10 или 12 цифр"
            }
        }
    }

    private fun validateWebsite(profile: EmployerProfileDto) {
        profile.websiteUrl?.let { url ->
            require(url.startsWith("http://") || url.startsWith("https://")) {
                "Сайт должен начинаться с http:// или https://"
            }
        }
    }

    private fun validateYear(profile: EmployerProfileDto) {
        profile.foundedYear?.let { year ->
            val currentYear = java.time.Year.now().value
            require(year in 1800..currentYear) {
                "Год основания должен быть от 1800 до $currentYear"
            }
        }
    }

    private fun validateCityAndLocation(profile: EmployerProfileDto) {
        profile.city?.let { city ->
            require(city.id != null && city.id!! > 0) {
                "Город должен быть сохранённым (id не может быть null или 0)"
            }
        }

        profile.location?.let { location ->
            require(location.id != null && location.id!! > 0) {
                "Локация должна быть сохранённой (id не может быть null или 0)"
            }
        }
    }

    private fun validateSocialLinks(profile: EmployerProfileDto) {
        profile.socialLinks?.forEach { link ->
            require(link.url.startsWith("http://") || link.url.startsWith("https://")) {
                "Ссылка ${link.url} должна начинаться с http:// или https://"
            }
        }
    }

    private fun validatePublicContacts(profile: EmployerProfileDto) {
        val contacts = profile.publicContacts
        for (contact in contacts) {
            require(contact.type in setOf(ContactType.EMAIL, ContactType.PHONE, ContactType.TELEGRAM, ContactType.WHATSAPP)) {
                "Недопустимый тип контакта: ${contact.type}"
            }
            require(contact.value.isNotBlank()) {
                "Значение контакта не может быть пустым"
            }
        }
    }
}