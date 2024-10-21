import React from 'react'
import allModes from '../modes/all-modes'

interface Props {
  onChange: (index: number) => void
}
export default ({ onChange }: Props) => {
  return (
    <section>
      {allModes.map((e, i) => (
        <label key={`${i}`}>
          <input type="radio" name="mode" onChange={() => onChange(i)} />
          <span>{e.label}</span>
        </label>
      ))}
    </section>
  )
}
