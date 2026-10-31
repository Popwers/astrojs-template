import eye_icon from '@assets/icons/eye.svg';
import eye_close_icon from '@assets/icons/eye_close.svg';
import { useState } from 'react';

interface PasswordInputProps {
	id: string;
	label: string;
	placeholder: string;
	autocomplete: string;
	name: string;
	className?: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	props?: React.ComponentProps<'input'>;
}

/**
 * Password input component used to input a password
 * @param props.className - Class name for the input
 * @param props.onChange - Change handler for the input
 * @returns The password input with its show/hide toggle
 */
export default ({
	id,
	autocomplete,
	name,
	label,
	onChange,
	placeholder,
	className,
	props,
}: PasswordInputProps) => {
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

	return (
		<div className='form-group'>
			<label htmlFor={id}>{label} </label>
			<div className='relative'>
				<input
					id={id}
					type={isPasswordVisible ? 'text' : 'password'}
					autoComplete={autocomplete}
					placeholder={placeholder}
					name={name}
					onChange={onChange}
					className={className}
					required
					{...props}
				/>
				<button
					type='button'
					onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
					aria-label='Voir le mot de passe'
					aria-pressed={isPasswordVisible}
					className='absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 cursor-pointer'>
					<img
						src={isPasswordVisible ? eye_close_icon.src : eye_icon.src}
						alt=''
						className='h-5 w-5'
						width={20}
						height={20}
						decoding='async'
					/>
				</button>
			</div>
		</div>
	);
};
