import React from 'react'

function SuccessBox(
  { children }: { children: React.ReactNode },
  ref: React.Ref<HTMLDivElement>,
) {
  return (
    <div ref={ref} className='glass-card-strong mx-auto max-w-4xl rounded-[2rem] p-8 text-center md:p-12'>
      {children}
    </div>
  )
}

export default React.forwardRef(SuccessBox)
