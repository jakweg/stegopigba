import React from 'react'
import { loadImage, readFileDataUrl } from '../util/generic'

interface Props {
  setImage: (file: HTMLImageElement | null) => void
}

export default ({ setImage }: Props) => {
  const onChange = async (e: any) => {
    const file = e.target.files[0] as File
    if (!file) {
      setImage(null)
    } else {
      const dataUrl = await readFileDataUrl(file)
      const img = await loadImage(dataUrl)
      setImage(img)
    }
  }

  return (
    <section>
      <h2>Image to work on:</h2>
      <input type="file" onChange={onChange} />
    </section>
  )
}
