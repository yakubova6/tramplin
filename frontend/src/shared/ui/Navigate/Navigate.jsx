import { useEffect } from 'react'
import { useLocation } from 'wouter'

function Navigate({ to }) {
    const [, navigate] = useLocation()

    useEffect(() => {
        navigate(to)
    }, [to, navigate])

    return null
}

export default Navigate