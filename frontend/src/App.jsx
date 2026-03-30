import { Redirect, Route, Switch } from 'wouter'
import OpportunitiesPage from './pages/Opportunities/OpportunitiesPage/OpportunitiesPage'
import OpportunityDetailPage from './pages/Opportunities/OpportunityDetailPage/OpportunityDetailPage'
import Login from './pages/Auth/Login/Login'
import Register from './pages/Auth/Register/Register'
import ForgotPassword from './pages/Auth/ForgotPassword/ForgotPassword'
import SeekerDashboard from './pages/Dashboard/SeekerDashboard/SeekerDashboard'
import EmployerDashboard from './pages/Dashboard/EmployerDashboard/EmployerDashboard'
import CuratorDashboard from './pages/Dashboard/CuratorDashboard/CuratorDashboard'
import ProfileEdit from './pages/ProfileEdit/ProfileEdit'
import ApplicantPublicProfile from './pages/ApplicantPublicProfile/ApplicantPublicProfile'
import SecuritySettings from './pages/Settings/SecuritySettings/SecuritySettings'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/main.scss'

function App() {
    return (
        <Switch>
            <Route path="/" component={OpportunitiesPage} />
            <Route path="/opportunities/:id" component={OpportunityDetailPage} />
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
    )
}

export default App