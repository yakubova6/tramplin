package ru.itplanet.trampline.profile.dao.dto

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import ru.itplanet.trampline.profile.model.enums.ApplicationsVisibility
import ru.itplanet.trampline.profile.model.enums.ContactsVisibility
import ru.itplanet.trampline.profile.model.enums.ProfileVisibility
import ru.itplanet.trampline.profile.model.enums.ResumeVisibility
import java.time.OffsetDateTime

@Entity
@Table(name = "applicant_profile")
open class ApplicantProfileDto {

    @Id
    @Column(name = "user_id")
    open var userId: Long = 0

    @Column(name = "first_name", length = 100)
    open var firstName: String = ""

    @Column(name = "last_name", length = 100)
    open var lastName: String = ""

    @Column(name = "middle_name", length = 100)
    open var middleName: String? = null

    @Column(name = "university_name", length = 255)
    open var universityName: String? = null

    @Column(name = "faculty_name", length = 255)
    open var facultyName: String? = null

    @Column(name = "study_program", length = 255)
    open var studyProgram: String? = null

    @Column(name = "course")
    open var course: Short? = null

    @Column(name = "graduation_year")
    open var graduationYear: Short? = null

    @Column(name = "city_id")
    open var cityId: Long? = null

    @Column(name = "about")
    open var about: String? = null

    @Column(name = "resume_text")
    open var resumeText: String? = null

    @Column(name = "portfolio_links", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    open var portfolioLinks: List<String> = emptyList()

    @Column(name = "contact_links", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    open var contactLinks: List<String> = emptyList()

    @Column(name = "profile_visibility", length = 32)
    @Enumerated(EnumType.STRING)
    open var profileVisibility: ProfileVisibility = ProfileVisibility.AUTHENTICATED

    @Column(name = "resume_visibility", length = 32)
    @Enumerated(EnumType.STRING)
    open var resumeVisibility: ResumeVisibility = ResumeVisibility.AUTHENTICATED

    @Column(name = "applications_visibility", length = 32)
    @Enumerated(EnumType.STRING)
    open var applicationsVisibility: ApplicationsVisibility = ApplicationsVisibility.PRIVATE

    @Column(name = "contacts_visibility", length = 32)
    @Enumerated(EnumType.STRING)
    open var contactsVisibility: ContactsVisibility = ContactsVisibility.AUTHENTICATED

    @Column(name = "open_to_work")
    open var openToWork: Boolean = true

    @Column(name = "open_to_events")
    open var openToEvents: Boolean = true

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    open var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at")
    open var updatedAt: OffsetDateTime? = null

    constructor()

    constructor(userId: Long) {
        this.userId = userId
    }

    constructor(
        userId: Long,
        firstName: String,
        lastName: String,
        middleName: String? = null,
        universityName: String? = null,
        facultyName: String? = null,
        studyProgram: String? = null,
        course: Short? = null,
        graduationYear: Short? = null,
        cityId: Long? = null,
        about: String? = null,
        resumeText: String? = null,
        portfolioLinks: List<String> = emptyList(),
        contactLinks: List<String> = emptyList(),
        profileVisibility: ProfileVisibility = ProfileVisibility.AUTHENTICATED,
        resumeVisibility: ResumeVisibility = ResumeVisibility.AUTHENTICATED,
        applicationsVisibility: ApplicationsVisibility = ApplicationsVisibility.PRIVATE,
        contactsVisibility: ContactsVisibility = ContactsVisibility.AUTHENTICATED,
        openToWork: Boolean = true,
        openToEvents: Boolean = true,
        createdAt: OffsetDateTime? = null,
        updatedAt: OffsetDateTime? = null
    ) {
        this.userId = userId
        this.firstName = firstName
        this.lastName = lastName
        this.middleName = middleName
        this.universityName = universityName
        this.facultyName = facultyName
        this.studyProgram = studyProgram
        this.course = course
        this.graduationYear = graduationYear
        this.cityId = cityId
        this.about = about
        this.resumeText = resumeText
        this.portfolioLinks = portfolioLinks
        this.contactLinks = contactLinks
        this.profileVisibility = profileVisibility
        this.resumeVisibility = resumeVisibility
        this.applicationsVisibility = applicationsVisibility
        this.contactsVisibility = contactsVisibility
        this.openToWork = openToWork
        this.openToEvents = openToEvents
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }
}
