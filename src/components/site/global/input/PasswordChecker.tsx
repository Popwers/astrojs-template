import { cn } from '@lib/utils';
import { useState } from 'react';

import PasswordInput from './PasswordInput.tsx';

interface PasswordCheckerProps {
	isNewPassword?: boolean;
}

const STRENGTH_RULES = {
	size: (password: string) => password.length >= 8,
	uppercase: (password: string) => /[A-Z]/.test(password),
	lowercase: (password: string) => /[a-z]/.test(password),
	number: (password: string) => /[0-9]/.test(password),
	special: (password: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
};

const STRENGTH_STEP = 20;

const getStrengthClass = (value: number) => {
	if (value <= 20) return 'bg-red';
	if (value <= 40) return 'bg-orange-500';
	if (value <= 60) return 'bg-yellow-500';
	if (value <= 80) return 'bg-blue';
	return 'bg-green';
};

const getWidthClass = (value: number) => {
	if (value <= 0) return 'w-0';
	if (value <= 20) return 'w-1/5';
	if (value <= 40) return 'w-2/5';
	if (value <= 60) return 'w-3/5';
	if (value <= 80) return 'w-4/5';
	return 'w-full';
};

const getConfirmationClass = (password: string, confirmation: string) => {
	if (password === '' || confirmation === '') return undefined;
	return password !== confirmation ? 'border-red focus:border-red' : 'border-green focus:border-green';
};

/**
 * Password checker component used to check the strength of a password
 * @param props.isNewPassword - If the password is for a new account or a reset password
 * @returns The password checker component
 */
export default ({ isNewPassword = false }: PasswordCheckerProps) => {
	const [password, setPassword] = useState('');
	const [passwordConfirmation, setPasswordConfirmation] = useState('');

	const passes = {
		size: STRENGTH_RULES.size(password),
		uppercase: STRENGTH_RULES.uppercase(password),
		lowercase: STRENGTH_RULES.lowercase(password),
		number: STRENGTH_RULES.number(password),
		special: STRENGTH_RULES.special(password),
	};
	const strength = Object.values(passes).filter(Boolean).length * STRENGTH_STEP;

	const ruleClass = (isPassing: boolean) =>
		cn('transition-colors', isPassing ? 'text-green' : password !== '' && 'text-red');

	return (
		<>
			<PasswordInput
				id='password'
				name='password'
				label={isNewPassword ? 'Nouveau mot de passe' : 'Mot de passe'}
				placeholder={isNewPassword ? 'Nouveau mot de passe' : 'Mot de passe'}
				autocomplete='new-password'
				onChange={(e) => setPassword(e.target.value)}
			/>
			<PasswordInput
				label='Confirmer votre mot de passe'
				className={getConfirmationClass(password, passwordConfirmation)}
				id='passwordConfirmation'
				name='passwordConfirmation'
				autocomplete='new-password'
				placeholder='Confirmer votre mot de passe'
				onChange={(e) => setPasswordConfirmation(e.target.value)}
			/>

			<div className='bg-blue-light mt-4 h-2.5 w-full rounded-full'>
				<progress className='sr-only' value={strength} max={100} aria-label='Force du mot de passe' />
				<div
					aria-hidden='true'
					className={cn(
						'h-2.5 rounded-full transition-all duration-200',
						getStrengthClass(strength),
						getWidthClass(strength),
					)}
				/>
			</div>

			<div className='form-group'>
				<p className='text-sm'>
					Votre mot de passe doit se composer au minimum de{' '}
					<span className={ruleClass(passes.size)}>huit caractères</span> et doit contenir au moins{' '}
					<span className={ruleClass(passes.uppercase)}>une majuscule</span>,{' '}
					<span className={ruleClass(passes.lowercase)}>une minuscule</span>,{' '}
					<span className={ruleClass(passes.number)}>un chiffre</span> et{' '}
					<span className={ruleClass(passes.special)}>un caractère spécial</span>.
				</p>
			</div>
		</>
	);
};
