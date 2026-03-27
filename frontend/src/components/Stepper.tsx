import { Check } from 'lucide-react';

interface Step {
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-start">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`flex items-start ${i < steps.length - 1 ? 'flex-1' : ''}`}
        >
          <div className="flex flex-col items-center" style={{ minWidth: 48 }}>
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                ${i < currentStep
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : i === currentStep
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-white border-slate-300 text-slate-400'
                }
              `}
            >
              {i < currentStep ? <Check size={18} strokeWidth={3} /> : i + 1}
            </div>
            <span
              className={`mt-2 text-[11px] font-medium text-center leading-tight hidden sm:block ${
                i <= currentStep ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </div>

          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mt-5 mx-1 rounded-full transition-colors ${
                i < currentStep ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
