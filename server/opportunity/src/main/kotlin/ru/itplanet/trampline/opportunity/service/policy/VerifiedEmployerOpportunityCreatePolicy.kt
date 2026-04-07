package ru.itplanet.trampline.opportunity.service.policy

import org.springframework.stereotype.Service
import ru.itplanet.trampline.opportunity.client.ProfileServiceClient
import ru.itplanet.trampline.opportunity.exception.EmployerOpportunityCreationNotAllowedException

@Service
class VerifiedEmployerOpportunityCreatePolicy(
    private val profileServiceClient: ProfileServiceClient,
) : EmployerOpportunityCreatePolicy {

    override fun checkCreateAllowed(currentUserId: Long) {
        val access = profileServiceClient.getEmployerOpportunityAccess(currentUserId)

        if (access.canCreateOpportunities) {
            return
        }

        when (access.verificationStatus.trim().uppercase()) {
            STATUS_NOT_FOUND -> throw EmployerOpportunityCreationNotAllowedException(
                "Перед созданием возможностей заполните профиль работодателя и отправьте компанию на верификацию",
            )

            STATUS_PENDING -> throw EmployerOpportunityCreationNotAllowedException(
                "Верификация работодателя ещё находится на рассмотрении",
            )

            STATUS_REJECTED -> throw EmployerOpportunityCreationNotAllowedException(
                "Верификация работодателя была отклонена. Исправьте данные и отправьте новую заявку",
            )

            STATUS_REVOKED -> throw EmployerOpportunityCreationNotAllowedException(
                "Данные компании были изменены после верификации. Отправьте компанию на повторную проверку",
            )

            else -> throw EmployerOpportunityCreationNotAllowedException(
                "Создавать возможности могут только верифицированные работодатели",
            )
        }
    }

    private companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_REJECTED = "REJECTED"
        const val STATUS_REVOKED = "REVOKED"
        const val STATUS_NOT_FOUND = "NOT_FOUND"
    }
}
