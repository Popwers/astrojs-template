import { Memo, Reactive, useObservable } from '@legendapp/state/react';

interface SelectInputProps {
	id: string;
	name: string;
	defaultValue?: string | number;
	options: { value: string | number; label: string }[];
	props?: React.ComponentProps<'select'>;
}

/**
 * Custom select input component
 * @param {string} props.id - The id of the select input
 * @param {string} props.name - The name of the select input
 * @param {string | number} props.defaultValue - The default value of the select input
 * @param {Array<{ value: string | number; label: string }>} props.options - The options of the select input
 * @param {React.ComponentProps<'select'>} props - The props of the select input
 * @returns {React.ReactNode} - The select input component
 */
export default ({ id, name, defaultValue, options, props }: SelectInputProps) => {
	const open = useObservable(false);
	const selected = useObservable({
		value: defaultValue || '',
		label: options.find(option => option.value === defaultValue)?.label || '',
	});

	const selectedClass = (): string => `select-selected ${selected.label.get() === '' && 'preholder'}`;
	const selectWrapperClass = (): string => `select-items ${open.get() ? 'select-show' : 'select-hide'}`;

	const handleSelect = (value: string | number) => {
		selected.set({
			value: value.toString(),
			label: options.find(option => option.value === value)?.label || '',
		});
		open.set(false);
	};

	return (
		<div className='select-controller'>
			<Reactive.select
				id={id}
				name={name}
				autoComplete='off'
				$value={selected.value}
				onChange={e => handleSelect(e.target.value)}
				{...props}
			>
				<option disabled hidden value=''>
					Sélectionner dans la liste déroulante
				</option>
				{options.map(option => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</Reactive.select>

			<Reactive.div $className={selectedClass} onClick={() => open.toggle()}>
				<Memo>{() => selected.label.get() || 'Sélectionner dans la liste déroulante'}</Memo>
			</Reactive.div>
			<Reactive.div $className={selectWrapperClass}>
				<div
					onClick={() => handleSelect('')}
					onKeyUp={e => {
						if (e.key === 'Enter' || e.key === ' ') handleSelect('');
					}}
				>
					Sélectionner dans la liste déroulante
				</div>
				<Memo>
					{() =>
						options.map(option => (
							<div
								className={`${selected.value.get() === option.value && 'same-as-selected '}`}
								key={option.value}
								onClick={() => handleSelect(option.value)}
								onKeyUp={e => {
									if (e.key === 'Enter') handleSelect(option.value);
								}}
							>
								{option.label}
							</div>
						))
					}
				</Memo>
			</Reactive.div>
		</div>
	);
};
