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
                   ...rest
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
            {...rest}
        />
    )
}

export default Input