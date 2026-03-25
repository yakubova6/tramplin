import { useMemo, useState } from 'react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '../../../components/Card'
import Button from '../../../components/Button'
import {
    getVerificationQueue,
    setVerificationStatus,
} from '../../../utils/mockModeration'
import './CuratorDashboard.scss'

function CuratorDashboard() {
    const [refresh, setRefresh] = useState(0)
    const queue = useMemo(() => getVerificationQueue(), [refresh])

    const pending = queue.filter((item) => item.status === 'pending')
    const reviewed = queue.filter((item) => item.status !== 'pending')

    const approveDraft = (id) => {
        setVerificationStatus(id, 'approved')
        setRefresh((v) => v + 1)
    }

    const rejectDraft = (id) => {
        setVerificationStatus(id, 'rejected', 'Отклонено куратором')
        setRefresh((v) => v + 1)
    }

    return (
        <div className="curator-page">
            <main className="curator-page__container">
                <h1 className="curator-page__title">Панель куратора</h1>

                <Card className="curator-page__card">
                    <CardHeader>
                        <CardTitle>Профили на верификацию</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pending.length === 0 ? (
                            <p className="curator-page__empty">Нет заявок.</p>
                        ) : (
                            <div className="curator-list">
                                {pending.map((item) => (
                                    <article key={item.id} className="curator-item">
                                        <div className="curator-item__meta">
                                            <p>
                                                <strong>{item.userDisplayName}</strong> ({item.userEmail})
                                            </p>
                                            <p>Роль: {item.role === 'EMPLOYER' ? 'Работодатель' : 'Соискатель'}</p>
                                            <p>Тип заявки: {item.type}</p>
                                        </div>

                                        <div className="curator-item__actions">
                                            <Button onClick={() => approveDraft(item.id)}>Одобрить</Button>
                                            <button
                                                type="button"
                                                className="curator-item__reject"
                                                onClick={() => rejectDraft(item.id)}
                                            >
                                                Отклонить
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="curator-page__card">
                    <CardHeader>
                        <CardTitle>Обработанные заявки</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reviewed.length === 0 ? (
                            <p className="curator-page__empty">Пока нет обработанных заявок.</p>
                        ) : (
                            <ul className="curator-reviewed">
                                {reviewed.map((item) => (
                                    <li key={item.id}>
                                        {item.userDisplayName} — {item.status}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}

export default CuratorDashboard