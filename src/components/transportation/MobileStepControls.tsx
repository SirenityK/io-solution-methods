type MobileStepControlsProps = Readonly<{
  currentStep: number;
  maxStep: number;
  onStepChange: (step: number) => void;
}>;

export const MobileStepControls = (props: MobileStepControlsProps) => (
  <div class="fixed inset-x-0 bottom-0 z-50 border-t border-base-300 bg-base-100/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur lg:hidden">
    <div class="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)] items-center gap-3">
      <button
        type="button"
        class="btn min-h-12 w-full"
        disabled={props.currentStep === 0}
        onClick={() => props.onStepChange(props.currentStep - 1)}
      >
        Anterior
      </button>
      <div class="text-center">
        <div class="text-xs text-base-content/60">Paso</div>
        <div class="font-mono font-bold">
          {props.currentStep} / {props.maxStep}
        </div>
      </div>
      <button
        type="button"
        class="btn btn-primary min-h-12 w-full"
        disabled={props.currentStep === props.maxStep}
        onClick={() => props.onStepChange(props.currentStep + 1)}
      >
        Siguiente
      </button>
    </div>
  </div>
);
