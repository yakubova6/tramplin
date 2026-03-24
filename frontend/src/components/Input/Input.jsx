import './Input.scss'

function Input({
                   id,
                   type = 'text',
                   value,
                   onChange,
                   placeholder = '',
                   required = false,
                   className = '',
                   name,
               }) {
    return (
        <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className={`input ${className}`.trim()}
        />
    )
}

export default Input