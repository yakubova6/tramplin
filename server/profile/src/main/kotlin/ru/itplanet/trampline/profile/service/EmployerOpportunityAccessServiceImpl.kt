package ru.itplanet.trampline.profile.service

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.itplanet.trampline.commons.model.profile.InternalEmployerOpportunityAccessResponse
import ru.itplanet.trampline.profile.dao.EmployerProfileDao
import ru.itplanet.trampline.profile.model.enums.VerificationStatus

@Service
class EmployerOpportunityAccessServiceImpl(
    private val employerProfileDao: EmployerProfileDao,
) : EmployerOpportunityAccessService {

    @Transactional(readOnly = true)
    override fun getEmployerOpportunityAccess(
        employerUserId: Long,
    ): InternalEmployerOpportunityAccessResponse {
        val employerProfile = employerProfileDao.findById(employerUserId).orElse(null)
            ?: return InternalEmployerOpportunityAccessResponse(
                employerUserId = employerUserId,
                verificationStatus = STATUS_NOT_FOUND,
                canCreateOpportunities = false,
            )

        val verificationStatus = employerProfile.verificationStatus.name

        return InternalEmployerOpportunityAccessResponse(
            employerUserId = employerUserId,
            verificationStatus = verificationStatus,
            canCreateOpportunities = employerProfile.verificationStatus == VerificationStatus.APPROVED,
        )
    }

    private companion object {
        const val STATUS_NOT_FOUND = "NOT_FOUND"
    }
}
