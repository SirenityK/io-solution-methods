import type { JSX } from "solid-js";
import { MobileStepControls } from "./MobileStepControls";
import { StepControls } from "./StepControls";

type TransportationMethodLayoutProps = Readonly<{
	currentStep: number;
	maxStep: number;
	onStepChange: (step: number) => void;
	main: JSX.Element;
	sidebar: JSX.Element;
}>;

export const TransportationMethodLayout = (
	props: TransportationMethodLayoutProps,
) => (
	<div class="mx-auto max-w-7xl px-4 pt-8 pb-28 lg:pb-8">
		<section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<div class="space-y-4">{props.main}</div>

			<aside class="space-y-4 lg:sticky lg:top-4 lg:self-start">
				<StepControls
					currentStep={props.currentStep}
					maxStep={props.maxStep}
					onStepChange={props.onStepChange}
				/>
				{props.sidebar}
			</aside>
		</section>

		<MobileStepControls
			currentStep={props.currentStep}
			maxStep={props.maxStep}
			onStepChange={props.onStepChange}
		/>
	</div>
);
