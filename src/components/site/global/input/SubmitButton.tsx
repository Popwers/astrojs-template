import { reactive, useObservable } from '@legendapp/state/react';
import { cn } from '@lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
	className?: string;
	label: string;
	id?: string;
	tabIndex?: number;
	disabled?: boolean;
	danger?: boolean;
}

const $MotionButton = reactive(motion.button);

const LOADING_DOT_CLASSES = ['delay-bounce-0', 'delay-bounce-1', 'delay-bounce-2'] as const;

/**
 * Submit button with loading state and animation
 * @param props.className - Class name for the button
 * @param props.label - Label for the button
 * @param props.id - Id for the button
 * @param props.tabIndex - Tab index for the button
 * @param props.disabled - Disabled state for the button
 * @param props.danger - Use the red danger tokens instead of blue
 * @returns The submit button component
 */
export default ({ className, label, id, tabIndex, disabled, danger = false }: Props) => {
	const isLoading = useObservable(false);
	const [isLongLoading, setIsLongLoading] = useState(false);
	const isBordered = className?.includes('bordered');
	const idleBackground = danger ? 'var(--color-red)' : 'var(--color-blue)';
	const hoverBackground = danger ? 'var(--color-red)' : 'var(--color-blue-saturated)';
	const borderedColor = danger ? 'var(--color-red)' : 'var(--color-blue)';
	const buttonRef = useRef<HTMLButtonElement>(null);

	const handleSubmit = useCallback(() => {
		isLoading.set(true);
		setTimeout(() => setIsLongLoading(true), 1000);
	}, [isLoading]);

	useEffect(() => {
		const button = buttonRef.current;
		if (!button) return;

		const form = button.closest('form');
		if (!form) return;

		form.addEventListener('submit', handleSubmit);
		return () => {
			form.removeEventListener('submit', handleSubmit);
			isLoading.set(false);
			setIsLongLoading(false);
		};
	}, [handleSubmit, isLoading]);

	return (
		<$MotionButton
			$animate={() => ({
				opacity: disabled ? 0.5 : 1,
				backgroundColor:
					isLoading.get() || isLongLoading || disabled
						? hoverBackground
						: isBordered
							? 'transparent'
							: idleBackground,
				color:
					isLoading.get() || isLongLoading || disabled
						? 'var(--color-white)'
						: isBordered
							? borderedColor
							: 'var(--color-white)',
				pointerEvents: isLoading.get() || isLongLoading || disabled ? 'none' : 'auto',
			})}
			whileHover={{
				backgroundColor: isBordered ? idleBackground : hoverBackground,
				color: 'var(--color-white)',
			}}
			whileTap={{
				backgroundColor: isBordered ? idleBackground : hoverBackground,
				color: 'var(--color-white)',
				scale: 0.95,
			}}
			className={cn(className, danger && 'border-red', 'overflow-hidden transition-none')}
			type='submit'
			tabIndex={tabIndex}
			ref={buttonRef}
			id={id}
			$disabled={() => isLoading.get() || isLongLoading || disabled}>
			<AnimatePresence mode='popLayout' initial={false}>
				<motion.span
					initial={{ opacity: 0, y: -100 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 100 }}
					className='h-4'
					key={isLongLoading ? 'loading' : 'label'}>
					{isLongLoading ? (
						<span className='flex items-center justify-center space-x-2'>
							{LOADING_DOT_CLASSES.map((delayClass) => (
								<span
									key={`loading-dot-${delayClass}`}
									className={cn(
										'inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current transition-discrete duration-700',
										delayClass,
									)}
								/>
							))}
						</span>
					) : (
						label
					)}
				</motion.span>
			</AnimatePresence>
		</$MotionButton>
	);
};
