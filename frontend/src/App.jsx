import { Suspense, lazy } from 'react'
import { Redirect, Route, Switch } from 'wouter'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/main.scss'

const OpportunitiesPage = lazy(() => import('./pages/Opportunities/OpportunitiesPage/OpportunitiesPage'))
const OpportunityDetailPage = lazy(() => import('./pages/Opportunities/OpportunityDetailPage/OpportunityDetailPage'))
const Login = lazy(() => import('./pages/Auth/Login/Login'))
const Register = lazy(() => import('./pages/Auth/Register/Register'))
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword/ForgotPassword'))
const SeekerDashboard = lazy(() => import('./pages/Dashboard/SeekerDashboard/SeekerDashboard'))
const EmployerDashboard = lazy(() => import('./pages/Dashboard/EmployerDashboard/EmployerDashboard'))
const CuratorDashboard = lazy(() => import('./pages/Dashboard/CuratorDashboard/CuratorDashboard'))
const ProfileEdit = lazy(() => import('./pages/ProfileEdit/ProfileEdit'))
const ApplicantSearchPage = lazy(() => import('./pages/ApplicantSearch/ApplicantSearchPage'))
const ApplicantPublicProfile = lazy(() => import('./pages/ApplicantPublicProfile/ApplicantPublicProfile'))
const SecuritySettings = lazy(() => import('./pages/Settings/SecuritySettings/SecuritySettings'))
const CuratorsAdminPage = lazy(() => import('./pages/Admin/CuratorsAdminPage/CuratorsAdminPage'))

function App() {
    return (
        <Suspense fallback={<div className="container" style={{ padding: '2rem 0' }}>Загрузка...</div>}>
            <Switch>
                <Route path="/" component={OpportunitiesPage} />
                <Route path="/opportunities/:id" component={OpportunityDetailPage} />

                <Route path="/seekers">
                    <ProtectedRoute>
                        <ApplicantSearchPage />
                    </ProtectedRoute>
                </Route>

                <Route path="/seekers/:id" component={ApplicantPublicProfile} />

                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/forgot-password" component={ForgotPassword} />

                <Route path="/seeker">
                    <ProtectedRoute allowedRoles={['APPLICANT']}>
                        <SeekerDashboard />
                    </ProtectedRoute>
                </Route>

                <Route path="/employer">
                    <ProtectedRoute allowedRoles={['EMPLOYER']}>
                        <EmployerDashboard />
                    </ProtectedRoute>
                </Route>

                <Route path="/curator">
                    <ProtectedRoute allowedRoles={['CURATOR', 'ADMIN']}>
                        <CuratorDashboard />
                    </ProtectedRoute>
                </Route>

                <Route path="/admin/curators">
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <CuratorsAdminPage />
                    </ProtectedRoute>
                </Route>

                <Route path="/profile/edit">
                    <ProtectedRoute allowedRoles={['APPLICANT', 'EMPLOYER']}>
                        <ProfileEdit />
                    </ProtectedRoute>
                </Route>

                <Route path="/settings/security">
                    <ProtectedRoute allowedRoles={['APPLICANT', 'EMPLOYER', 'CURATOR', 'ADMIN']}>
                        <SecuritySettings />
                    </ProtectedRoute>
                </Route>

                <Route>
                    <Redirect to="/" />
                </Route>
            </Switch>
        </Suspense>
    )
}

export default App