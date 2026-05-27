type MobileStepControlsProps = Readonly<{
	currentStep: number;
	maxStep: number;
	onStepChange: (step: number) => void;
}>;

export const MobileStepControls = (props: MobileStepControlsProps) => (
	<div class="fixed inset-x-0 bottom-0 z-50 border-t border-base-300 bg-base-100/95 p-3 shadow-2xl backdrop-blur lg:hidden">
		<div class="mx-auto flex max-w-xl items-center gap-3">
			<button
				type="button"
				class="btn btn-sm flex-1"
				disabled={props.currentStep === 0}
				onClick={() => props.onStepChange(props.currentStep - 1)}
			>
				Anterior
			</button>
			<div class="min-w-16 text-center">
				<div class="text-xs text-base-content/60">Paso</div>
				<div class="font-mono font-bold">
					{props.currentStep} / {props.maxStep}
				</div>
			</div>
			<button
				type="button"
				class="btn btn-primary btn-sm flex-1"
				disabled={props.currentStep === props.maxStep}
				onClick={() => props.onStepChange(props.currentStep + 1)}
			>
				Siguiente
			</button>
		</div>
	</div>
);
