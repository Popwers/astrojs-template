import { reactive, useObservable } from '@legendapp/state/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
	className?: string;
	label: string;
	id?: string;
	tabIndex?: number;
	disabled?: boolean;
}

const $MotionButton = reactive(motion.button);

/**
 * Submit button with loading state and animation
 * @param {string} props.className - Class name for the button
 * @param {string} props.label - Label for the button
 * @param {string} props.id - Id for the button
 * @param {number} props.tabIndex - Tab index for the button
 * @param {boolean} props.disabled - Disabled state for the button
 * @returns {JSX.Element}
 */
export default ({ className, label, id, tabIndex, disabled }: Props) => {
	const isLoading = useObservable(false);
	const [isLongLoading, setIsLongLoading] = useState(false);
	const isBordered = className?.includes('bordered');
	const buttonRef = useRef<HTMLButtonElement>(null);

	const handleSubmit = () => {
		isLoading.set(true);
		setTimeout(() => setIsLongLoading(true), 1000);
	};

	/**
	 * Handle the submit event
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: prevent update from loading state
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
	}, []);

	return (
		<$MotionButton
			layout
			$animate={() => ({
				opacity: disabled ? 0.5 : 1,
				backgroundColor:
					isLoading.get() || isLongLoading || disabled
						? 'var(--color-blue-saturated)'
						: isBordered
							? '#00000000'
							: 'var(--color-blue)',
				color:
					isLoading.get() || isLongLoading || disabled
						? 'var(--color-white)'
						: isBordered
							? 'var(--color-blue)'
							: 'var(--color-white)',
				pointerEvents: isLoading.get() || isLongLoading || disabled ? 'none' : 'auto',
			})}
			whileHover={{
				backgroundColor: isBordered ? 'var(--color-blue)' : 'var(--color-blue-saturated)',
				color: 'var(--color-white)',
			}}
			whileTap={{
				backgroundColor: isBordered ? 'var(--color-blue)' : 'var(--color-blue-saturated)',
				color: 'var(--color-white)',
				scale: 0.95,
			}}
			className={`${className} overflow-hidden transition-none`}
			type='submit'
			tabIndex={tabIndex}
			ref={buttonRef}
			id={id}
			$disabled={() => isLoading.get() || isLongLoading || disabled}
		>
			<AnimatePresence mode='popLayout' initial={false}>
				<motion.span
					initial={{ opacity: 0, y: -100 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 100 }}
					className='h-4'
					key={isLongLoading ? 'loading' : 'label'}
				>
					{isLongLoading ? (
						<span className='flex justify-center items-center space-x-2'>
							{[0, 0.175, 0.35].map(delay => (
								<span
									key={`loading-dot-${delay}`}
									className='inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce duration-700 transition-discrete'
									style={{ animationDelay: `${delay}s` }}
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
