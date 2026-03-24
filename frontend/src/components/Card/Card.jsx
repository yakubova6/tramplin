import './Card.scss'

export function Card({ children, className = '' }) {
    return <div className={`card ${className}`.trim()}>{children}</div>
}

export function CardHeader({ children, className = '' }) {
    return <div className={`card__header ${className}`.trim()}>{children}</div>
}

export function CardTitle({ children, className = '' }) {
    return <h2 className={`card__title ${className}`.trim()}>{children}</h2>
}

export function CardDescription({ children, className = '' }) {
    return <p className={`card__description ${className}`.trim()}>{children}</p>
}

export function CardContent({ children, className = '' }) {
    return <div className={`card__content ${className}`.trim()}>{children}</div>
}

export function CardFooter({ children, className = '' }) {
    return <div className={`card__footer ${className}`.trim()}>{children}</div>
}