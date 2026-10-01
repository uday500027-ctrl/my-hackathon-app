export default function RedactionDemo() {
  return (
    <div className="w-full max-w-[440px]">
      {/* Label chip above the sheet */}
      <div className="mb-3 flex items-center">
        <span className="inline-flex items-center rounded-full border border-[#2f5e3e]/30 bg-[#2f5e3e]/10 px-3 py-1 text-xs font-medium text-[#2f5e3e]">
          Masked before it leaves
        </span>
      </div>

      {/* Document sheet */}
      <div
        aria-hidden="true"
        className="relative w-full aspect-[4/3] rounded-lg border border-[#e5e2db] bg-[#fffefb] p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] flex flex-col justify-between select-none"
      >
        {/* Line 1: plain grey line */}
        <div className="h-2.5 sm:h-3 rounded-full bg-[#d9d6cf] w-[86%]" />

        {/* Line 2: with redaction bar 1 */}
        <div className="relative h-2.5 sm:h-3 rounded-full bg-[#d9d6cf] w-[72%] overflow-hidden">
          <span className="absolute inset-y-0 left-[22%] w-[45%] overflow-hidden rounded-full">
            <span className="redact-bar-1 block h-full bg-[#1a1a1a] rounded-full" />
          </span>
        </div>

        {/* Line 3: plain grey line */}
        <div className="h-2.5 sm:h-3 rounded-full bg-[#d9d6cf] w-[94%]" />

        {/* Line 4: with redaction bar 2 */}
        <div className="relative h-2.5 sm:h-3 rounded-full bg-[#d9d6cf] w-[80%] overflow-hidden">
          <span className="absolute inset-y-0 left-[30%] w-[38%] overflow-hidden rounded-full">
            <span className="redact-bar-2 block h-full bg-[#1a1a1a] rounded-full" />
          </span>
        </div>

        {/* Line 5: plain grey line */}
        <div className="h-2.5 sm:h-3 rounded-full bg-[#d9d6cf] w-[56%]" />

        {/* Line 6: with redaction bar 3 */}
        <div className="relative h-2.5 sm:h-3 rounded-full bg-[#d9d6cf] w-[68%] overflow-hidden">
          <span className="absolute inset-y-0 left-[10%] w-[52%] overflow-hidden rounded-full">
            <span className="redact-bar-3 block h-full bg-[#1a1a1a] rounded-full" />
          </span>
        </div>

        {/* Line 7: with redaction bar 4 */}
        <div className="relative h-2.5 sm:h-3 rounded-full bg-[#d9d6cf] w-[84%] overflow-hidden">
          <span className="absolute inset-y-0 left-[42%] w-[35%] overflow-hidden rounded-full">
            <span className="redact-bar-4 block h-full bg-[#1a1a1a] rounded-full" />
          </span>
        </div>

        {/* Line 8: plain grey line */}
        <div className="h-2.5 sm:h-3 rounded-full bg-[#d9d6cf] w-[42%]" />
      </div>
    </div>
  );
}
