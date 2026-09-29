import { cn } from '@/lib/utils'
export const GridLineHorizontal = ({ className, offset }) => {
  return (
    <div
      style={{
        '--background': '#ffffff',
        '--height': '1px',
        '--width': '5px',
        '--fade-stop': '90%',
        '--offset': offset || '200px', //-100px if you want to keep the line inside
        maskComposite: 'exclude',
      }}
      className={cn(
        '[--color:var(--amw-line)]',
        'absolute left-[calc(var(--offset)/2*-1)] h-[var(--height)] w-[calc(100%+var(--offset))]',
        'bg-[linear-gradient(to_right,var(--color),var(--color)_50%,transparent_0,transparent)]',
        '[background-size:var(--width)_var(--height)]',
        '[mask:linear-gradient(to_left,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_right,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]',
        '[mask-composite:exclude]',
        'z-30',
        className
      )}
    ></div>
  )
}
export const GridLineVertical = ({ className, offset }) => {
  return (
    <div
      style={{
        '--background': '#ffffff',
        '--height': '5px',
        '--width': '1px',
        '--fade-stop': '90%',
        '--offset': offset || '150px', //-100px if you want to keep the line inside
        maskComposite: 'exclude',
      }}
      className={cn(
        '[--color:var(--amw-line)]',
        'absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-[var(--width)]',
        'bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)]',
        '[background-size:var(--width)_var(--height)]',
        '[mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]',
        '[mask-composite:exclude]',
        'z-30',
        className
      )}
    ></div>
  )
}
