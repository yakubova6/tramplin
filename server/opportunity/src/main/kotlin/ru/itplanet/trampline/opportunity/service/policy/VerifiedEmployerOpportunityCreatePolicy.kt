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
                "Complete employer profile and pass verification before creating opportunities",
            )

            STATUS_PENDING -> throw EmployerOpportunityCreationNotAllowedException(
                "Employer verification is still pending",
            )

            STATUS_REJECTED -> throw EmployerOpportunityCreationNotAllowedException(
                "Employer verification was rejected. Submit a new verification request",
            )

            else -> throw EmployerOpportunityCreationNotAllowedException(
                "Only verified employers can create opportunities",
            )
        }
    }

    private companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_REJECTED = "REJECTED"
        const val STATUS_NOT_FOUND = "NOT_FOUND"
    }
}
