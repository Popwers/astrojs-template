import { cn } from '@lib/utils';
import { AnimatePresence, domAnimation, LazyMotion, m, MotionConfig } from 'motion/react';
import { type RefObject, useEffect, useRef, useState } from 'react';

interface Props {
	className?: string;
	label: string;
	id?: string;
	tabIndex?: number;
	disabled?: boolean;
	danger?: boolean;
}

// `idle` until the form submits, `loading` right after, `long` once the wait passes a second.
type SubmitPhase = 'idle' | 'loading' | 'long';

const LONG_LOADING_DELAY_MS = 1000;

const LOADING_DOT_CLASSES = ['delay-bounce-0', 'delay-bounce-1', 'delay-bounce-2'] as const;

/**
 * Tracks the submit lifecycle of the form that owns `buttonRef`.
 * @param buttonRef - Ref of the submit button inside the form
 * @returns The current phase, back to `idle` when the form unmounts
 */
const useSubmitPhase = (buttonRef: RefObject<HTMLButtonElement | null>) => {
	const [phase, setPhase] = useState<SubmitPhase>('idle');

	useEffect(() => {
		const form = buttonRef.current?.closest('form');
		if (!form) return;

		const handleSubmit = () => setPhase('loading');
		form.addEventListener('submit', handleSubmit);
		return () => {
			form.removeEventListener('submit', handleSubmit);
			setPhase('idle');
		};
	}, [buttonRef]);

	useEffect(() => {
		if (phase !== 'loading') return;

		const longLoadingTimer = setTimeout(() => setPhase('long'), LONG_LOADING_DELAY_MS);
		return () => clearTimeout(longLoadingTimer);
	}, [phase]);

	return phase;
};

const LoadingDots = () => (
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
);

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
	const buttonRef = useRef<HTMLButtonElement>(null);
	const phase = useSubmitPhase(buttonRef);
	const isBusy = phase !== 'idle' || Boolean(disabled);
	const isBordered = Boolean(className?.includes('bordered'));
	const idleBackground = danger ? 'var(--color-red)' : 'var(--color-blue)';
	const hoverBackground = danger ? 'var(--color-red)' : 'var(--color-blue-saturated)';
	const borderedColor = danger ? 'var(--color-red)' : 'var(--color-blue)';
	const restingBackground = isBordered ? 'transparent' : idleBackground;
	const restingColor = isBordered ? borderedColor : 'var(--color-white)';
	const pressedBackground = isBordered ? idleBackground : hoverBackground;

	return (
		<LazyMotion features={domAnimation} strict>
			<MotionConfig reducedMotion='user'>
				<m.button
					initial={false}
					animate={{
						opacity: disabled ? 0.5 : 1,
						backgroundColor: isBusy ? hoverBackground : restingBackground,
						color: isBusy ? 'var(--color-white)' : restingColor,
						pointerEvents: isBusy ? 'none' : 'auto',
					}}
					whileHover={{ backgroundColor: pressedBackground, color: 'var(--color-white)' }}
					whileTap={{
						backgroundColor: pressedBackground,
						color: 'var(--color-white)',
						scale: 0.95,
					}}
					className={cn(className, danger && 'border-red', 'overflow-hidden transition-none')}
					type='submit'
					tabIndex={tabIndex}
					ref={buttonRef}
					id={id}
					disabled={isBusy}>
					<AnimatePresence mode='popLayout' initial={false}>
						<m.span
							initial={{ opacity: 0, y: -100 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 100 }}
							className='h-4'
							key={phase === 'long' ? 'loading' : 'label'}>
							{phase === 'long' ? <LoadingDots /> : label}
						</m.span>
					</AnimatePresence>
				</m.button>
			</MotionConfig>
		</LazyMotion>
	);
};
