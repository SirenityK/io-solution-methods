import type { InitialTransportationMethod } from "../../lib";

type TransportationMethodHeaderProps = Readonly<{
	title: string;
	description: string;
	selectedMethod: InitialTransportationMethod;
	onMethodChange: (method: InitialTransportationMethod) => void;
}>;

const methodOptions: readonly Readonly<{
	value: InitialTransportationMethod;
	label: string;
}>[] = [
	{ value: "least-cost", label: "Costo mínimo" },
	{ value: "northwest-corner", label: "Esquina noroeste" },
	{ value: "vogel", label: "Aproximación de Vogel" },
];

export const TransportationMethodHeader = (
	props: TransportationMethodHeaderProps,
) => (
	<div class="flex flex-wrap items-end justify-between gap-4 bg-linear-to-r from-primary/10 via-base-200 to-secondary/10 p-6 rounded-box">
		<div>
			<div class="badge badge-primary badge-outline">Método de transporte</div>
			<h1 class="mt-3 text-4xl font-bold">{props.title}</h1>
			<p class="mt-3 max-w-3xl text-base-content/70">{props.description}</p>
		</div>

		<label class="form-control w-full max-w-xs">
			<span class="label">
				<span class="label-text">Algoritmo</span>
			</span>
			<select
				class="select select-bordered"
				value={props.selectedMethod}
				onChange={(event) =>
					props.onMethodChange(
						event.currentTarget.value as InitialTransportationMethod,
					)
				}
			>
				{methodOptions.map((option) => (
					<option value={option.value}>{option.label}</option>
				))}
			</select>
		</label>
	</div>
);
