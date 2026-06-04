type StepControlsProps = Readonly<{
  currentStep: number;
  maxStep: number;
  onStepChange: (step: number) => void;
}>;

export const StepControls = (props: StepControlsProps) => (
  <div class="card bg-base-200">
    <div class="card-body gap-4">
      <div class="flex items-center justify-between">
        <h2 class="card-title">Paso {props.currentStep}</h2>
        <div class="badge badge-secondary">
          {props.currentStep} / {props.maxStep}
        </div>
      </div>
      <input
        type="range"
        min="0"
        max={props.maxStep}
        value={props.currentStep}
        class="range range-primary"
        onInput={(event) =>
          props.onStepChange(event.currentTarget.valueAsNumber)
        }
      />
      <div class="join grid grid-cols-2">
        <button
          type="button"
          class="btn join-item"
          disabled={props.currentStep === 0}
          onClick={() => props.onStepChange(props.currentStep - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          class="btn btn-primary join-item"
          disabled={props.currentStep === props.maxStep}
          onClick={() => props.onStepChange(props.currentStep + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
);
